import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

type CopilotRequest = {
  question: string;
  context: {
    applicationId?: string;
    organizationName?: string;
    summary: string;
    records: Array<{ id: string; type: string; label: string; detail: string; href?: string }>;
  };
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { code: 'method_not_allowed' });

  const internalKey = Deno.env.get('PIHUB_INTERNAL_FUNCTION_KEY');
  if (!internalKey || req.headers.get('x-pihub-internal-key') !== internalKey) {
    return json(401, { code: 'unauthorized' });
  }

  const baseUrl = (Deno.env.get('OLLAMA_BASE_URL') || 'http://ollama:11434').replace(/\/$/, '');
  const model = Deno.env.get('OLLAMA_MODEL') || 'qwen3:8b';
  const bearer = Deno.env.get('OLLAMA_BEARER_TOKEN');
  const input = await req.json() as CopilotRequest;

  if (!input.question?.trim() || !input.context?.summary || !Array.isArray(input.context.records)) {
    return json(400, { code: 'invalid_request', message: 'Question and authorized Borrower context are required.' });
  }
  if (input.question.length > 2000 || input.context.records.length > 80) {
    return json(413, { code: 'context_too_large' });
  }

  const evidence = input.context.records.map((r) =>
    `[${r.id}] ${r.type}: ${r.label} — ${r.detail}${r.href ? ` (${r.href})` : ''}`
  ).join('\n');

  const system = `You are PiHub Borrower Copilot. Answer only from the authorized Borrower-visible context supplied below.\n` +
    `Never infer or expose confidential lender policy, internal underwriting notes, investment-committee reasoning, hidden risk scores, KYC/AML investigation details, or data from another organization.\n` +
    `Do not make credit, legal, compliance, valuation, payment-settlement or covenant determinations. Explain the authoritative status and the Borrower's next action.\n` +
    `When you rely on a record, cite its bracketed record ID exactly, e.g. [REQ-1004]. If the context does not support the answer, state that plainly.\n` +
    `Keep the answer concise, professional and action-oriented.\n\nWorkspace summary:\n${input.context.summary}\n\nAuthorized records:\n${evidence}`;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {})
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: input.question.trim() }
      ],
      options: { temperature: 0.2, num_predict: 500 }
    })
  });

  if (!response.ok) {
    return json(502, { code: 'copilot_provider_failed', message: `Copilot provider returned ${response.status}.` });
  }

  const payload = await response.json() as { message?: { content?: string } };
  const answer = payload.message?.content?.trim();
  if (!answer) return json(502, { code: 'copilot_empty_response' });

  return json(200, { answer, provider: 'ollama', model });
});
