import React, { useMemo, useState } from 'react';
import { Card, EmptyState, PageHead } from '../components/UI';
import { useBorrowerStore } from '../state/store';

export function MessagesPage() {
  const { state, app, respondToRequest } = useBorrowerStore();
  const threads = useMemo(()=>state.requests.filter((r)=>r.applicationId===app.id),[state.requests,app.id]);
  const [selected, setSelected] = useState(threads[0]?.id ?? '');
  const [text,setText]=useState('');
  const thread=threads.find((r)=>r.id===selected);
  if (!threads.length) return <div className="route-stage"><PageHead eyebrow="Borrower / Collaboration" title="Messages" subtitle="Conversation history connected to your financing application."/><EmptyState title="No conversations" body="PiHub request conversations will appear here."/></div>;
  return <div className="route-stage"><PageHead eyebrow="Borrower / Collaboration" title="Messages" subtitle="Application-linked conversations. Threads stay tied to the request or decision context that created them."/><div className="message-layout"><Card title="Conversations"><div className="conversation-list">{threads.map((item)=><button key={item.id} className={selected===item.id?'active':''} onClick={()=>setSelected(item.id)}><strong>{item.title}</strong><small>{item.messages.at(-1)?.text ?? item.description}</small></button>)}</div></Card>{thread&&<Card title={thread.title} subtitle={`Request ${thread.id}`}><div className="thread tall">{thread.messages.map((m)=><div className={`message-bubble ${m.author}`} key={m.id}><div><strong>{m.author==='borrower'?'You':'PiHub'}</strong><small>{new Date(m.createdAt).toLocaleString()}</small></div><p>{m.text}</p></div>)}</div><form className="reply-inline" onSubmit={(e)=>{e.preventDefault();if(text.trim()){respondToRequest(thread.id,text);setText('')}}}><textarea aria-label="Message" rows={3} value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a message..."/><button className="button primary" disabled={!text.trim()}>Send</button></form></Card>}</div></div>;
}
