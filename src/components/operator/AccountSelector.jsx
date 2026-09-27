import React from 'react';
export default function AccountSelector({ accounts, value, onChange }) {
  return <label className="field-label max-w-sm mb-6">Account view
    <select className="operator-input" value={value} onChange={event => onChange(event.target.value)}>
      <option value="">All accounts</option>
      {accounts.filter(account => account.active).map(account => <option key={account.id} value={account.id}>{account.label} · {account.email}</option>)}
    </select>
  </label>;
}