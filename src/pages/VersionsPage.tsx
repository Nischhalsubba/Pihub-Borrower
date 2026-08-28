import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, EmptyState, PageHead, Status } from '../components/UI';
import { useBorrowerStore } from '../state/store';

export function VersionsPage() {
  const { state, app, createDraftFromVersion } = useBorrowerStore();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const versions = state.applicationVersions.filter((item) => item.applicationId === app.id).sort((a,b)=>b.version-a.version);
  const copy = (id: string, version: number) => {
    createDraftFromVersion(id);
    setNotice(`A new draft was created from version ${version}.`);
    setTimeout(() => navigate('/application'), 500);
  };
  return <div className="route-stage"><PageHead eyebrow="Borrower / Applications" title="Application versions" subtitle="Understand what changed and create a new draft from a prior submitted or edited snapshot without overwriting history." />
    {notice && <div className="success-banner" role="status">{notice}</div>}
    {versions.length === 0 ? <EmptyState title="No version history" body="Saved application changes will appear here." /> : <div className="version-list">{versions.map((version, index)=><Card key={version.id}><div className="version-row"><div><div className="version-title"><strong>Version {version.version}</strong>{index===0&&<Status tone="info">Current</Status>}</div><small>{version.reason} · {version.actor} · {new Date(version.createdAt).toLocaleString()}</small><p>{version.snapshot.financing.purpose || 'No financing purpose'} · {version.snapshot.status.replaceAll('_',' ')} · {version.snapshot.project.name || 'Project not named'}</p></div><button className="button secondary" disabled={index===0} onClick={()=>copy(version.id,version.version)}>Create draft from version</button></div></Card>)}</div>}
  </div>;
}
