import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHead } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import { askBorrowerCopilot } from '../services/platformApi';
import { isApiRuntime } from '../services/runtime';

const prompts = [
  'What does PiHub still need from me?',
  'Which documents are missing?',
  'Explain my covenant status',
  'Summarize open requests',
  'Compare the current financing offers'
];

export function CopilotPage() {
  const { state, feature } = useBorrowerStore();
  const [body,setBody]=useState('');
  const [remoteMessages,setRemoteMessages]=useState<Array<{id:string;role:'user'|'assistant';body:string;createdAt:string;href?:string}>>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const ask=async(text:string)=>{
    const question=text.trim();
    if(!question||busy)return;
    setBody('');setError('');
    if(!isApiRuntime()){feature({type:'copilot_ask',body:question});return;}
    const userMessage={id:`remote-user-${Date.now()}`,role:'user' as const,body:question,createdAt:new Date().toISOString()};
    setRemoteMessages((items)=>[...items,userMessage]);
    setBusy(true);
    try{
      const result=await askBorrowerCopilot({applicationId:state.activeApplicationId,question});
      setRemoteMessages((items)=>[...items,{id:`remote-assistant-${Date.now()}`,role:'assistant',body:result.answer,createdAt:new Date().toISOString(),href:result.href}]);
    }catch(err){setError(err instanceof Error?err.message:'Copilot request failed.');}
    finally{setBusy(false);}
  };
  const conversation=isApiRuntime()?remoteMessages:state.advanced.copilot;
  return <div className="route-stage">
    <PageHead eyebrow="Borrower / Assistance" title="Borrower Copilot" subtitle="Plain-language guidance over your Borrower workspace. It explains and navigates; it does not make credit, compliance or legal decisions."/>
    <div className="demo-banner"><strong>Guardrail:</strong><span>{isApiRuntime()?'Production answers are requested through the PiHub API, which must assemble authorized Borrower-only context server-side.':'Demo answers are deterministic and use only Borrower-visible workspace state.'} The Copilot cannot make credit, compliance, legal, settlement or covenant decisions.</span></div>
    <div className="copilot-layout">
      <Card title="Ask about your financing" subtitle="Try a common task or ask in your own words.">
        <div className="prompt-chips">{prompts.map((p)=><button className="chip-button" key={p} onClick={()=>ask(p)}>{p}</button>)}</div>
        <form className="copilot-compose" onSubmit={(e)=>{e.preventDefault();ask(body)}}><textarea rows={4} value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Ask about next actions, documents, covenants, requests or terms…" aria-label="Ask Borrower Copilot"/><div className="form-actions"><button className="button primary" disabled={!body.trim()||busy}>{busy?'Asking…':'Ask Copilot'}</button></div>{error&&<p className="form-error" role="alert">{error} Retry when the connection is available.</p>}</form>
      </Card>
      <Card title="Conversation" subtitle="Answers remain informational and link back to authoritative workflow screens.">
        <div className="copilot-thread" aria-live="polite">{conversation.map((m)=><div className={`copilot-message ${m.role}`} key={m.id}><small>{m.role==='assistant'?'PiHub Copilot':'You'} · {new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small><p>{m.body}</p>{m.href&&<Link className="text-link" to={m.href}>Open related workspace</Link>}</div>)}</div>
      </Card>
    </div>
  </div>;
}
