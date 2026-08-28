import React, { useRef, useState } from 'react';
import { Card, EmptyState, PageHead, Status } from '../components/UI';
import { Icon } from '../components/Icons';
import { useBorrowerStore } from '../state/store';
import type { BorrowerDocument } from '../state/model';
import { workflowProfileForApplication } from '../state/advanced';

const formatSize = (size: number) => size ? `${(size / 1024 / 1024).toFixed(size > 1024 * 1024 ? 1 : 2)} MB` : 'Awaiting upload';

export function DocumentsPage() {
  const { state, app, mode, uploadDocument, removeDocument, downloadDocument } = useBorrowerStore();
  const [category, setCategory] = useState('Financials');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success'|'error'>('success');
  const [uploading, setUploading] = useState(false);
  const [replaceId, setReplaceId] = useState<string>();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const docs = state.documents.filter((doc) => doc.applicationId === app.id);
  const workflow = workflowProfileForApplication(state, app.id);
  const categories = Array.from(new Set(['Financials','Corporate','Project','Legal','Ownership','Valuation', ...workflow.requiredDocumentCategories, 'Other']));

  const choose = (doc?: BorrowerDocument) => { setReplaceId(doc?.id); if (doc) setCategory(doc.category); fileRef.current?.click(); };
  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []); if (!files.length) return;
    const selectedFiles = replaceId ? files.slice(0, 1) : files;
    const allowed = ['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const invalid = selectedFiles.find((file) => file.size > 25 * 1024 * 1024 || (file.type && !allowed.includes(file.type)));
    if (invalid) { setNoticeTone('error'); setNotice(`${invalid.name} is not an allowed PDF, PNG, JPG, XLSX or DOCX file under 25 MB.`); event.target.value=''; return; }
    setUploading(true); setNotice('');
    try {
      for (const [index, file] of selectedFiles.entries()) await uploadDocument(file, category, index === 0 ? replaceId : undefined);
      setNoticeTone('success');
      setNotice(mode === 'api' ? `${selectedFiles.length} document${selectedFiles.length===1?'':'s'} uploaded to PiHub secure storage and queued for validation.` : `${selectedFiles.length} document${selectedFiles.length===1?'':'s'} persisted in browser IndexedDB.`);
      setReplaceId(undefined); event.target.value = '';
    } catch (reason) { setNoticeTone('error'); setNotice(reason instanceof Error ? reason.message : 'Document upload failed. Try again.'); }
    finally { setUploading(false); }
  };
  const download = async (doc: BorrowerDocument) => { const ok = await downloadDocument(doc); setNoticeTone(ok ? 'success' : 'error'); setNotice(ok ? `Downloading ${doc.name}.` : 'The file could not be downloaded. Refresh or contact PiHub if the problem continues.'); };

  return <div className="route-stage"><PageHead eyebrow="Borrower / Information" title="Documents" subtitle="Upload, replace, download and track every borrower-facing document requirement." action={<button className="button primary" disabled={uploading} onClick={() => choose()}><Icon name="upload" size={16}/>{uploading ? 'Uploading…' : 'Upload documents'}</button>} />
    <input ref={fileRef} className="sr-only" type="file" aria-label="Upload borrower documents" multiple={!replaceId} onChange={onFile} />
    <div className="demo-banner"><Icon name="document" size={16}/><span><strong>{mode === 'api' ? 'Secure PiHub storage.' : 'Functional demo storage.'}</strong> {mode === 'api' ? 'Uploads use server-authorized intents; the backend validates file metadata and scan status before a document becomes trusted.' : 'Uploaded file blobs persist in this browser via IndexedDB. Production switches this page to the secure document API.'}</span></div>
    {notice && <div className={noticeTone === 'error' ? 'form-alert page-alert' : 'success-banner'} role={noticeTone === 'error' ? 'alert' : 'status'}>{notice}</div>}
    <Card><div className="filter-row compact"><label>Upload category<select value={category} onChange={(e)=>setCategory(e.target.value)}>{categories.map((item)=><option key={item}>{item}</option>)}</select></label><span className="filter-note">{workflow.label} · Max file size: 25 MB</span></div></Card>
    {docs.length === 0 ? <EmptyState title="No document requirements" body="PiHub document requirements and your uploads will appear here." /> : <Card title="Document request center" subtitle="Required, uploaded, review and remediation status in one place."><div className="data-table documents-table"><div className="data-head"><span>Document</span><span>Category</span><span>Status</span><span>Version</span><span>Due</span><span>Actions</span></div>{docs.map((doc) => <div className="data-row" key={doc.id}><div className="document-name"><Icon name="document" size={17}/><span><strong>{doc.name}</strong><small>{formatSize(doc.size)}{doc.rejectionReason ? ` · ${doc.rejectionReason}` : ''}</small></span></div><span>{doc.category}</span><Status tone={doc.status === 'accepted' ? 'success' : doc.status === 'rejected' || doc.status === 'expired' ? 'danger' : doc.status === 'required' ? 'warning' : 'info'}>{doc.status.replace('_',' ')}</Status><span>v{doc.version}</span><span>{doc.dueDate ?? '—'}</span><div className="row-actions"><button className="icon-button" aria-label={`Download ${doc.name}`} onClick={()=>download(doc)} disabled={!doc.blobKey}><Icon name="download" size={16}/></button><button className="icon-button" aria-label={`Replace ${doc.name}`} onClick={()=>choose(doc)}><Icon name="edit" size={16}/></button><button className="icon-button danger" aria-label={`Remove ${doc.name}`} onClick={()=>removeDocument(doc.id)} disabled={doc.status === 'required' && !doc.blobKey}><Icon name="trash" size={16}/></button></div></div>)}</div></Card>}
  </div>;
}
