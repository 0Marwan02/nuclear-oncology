// Green file = Thyroid CANCER (I-131 WBS, post-thyroidectomy)
// Red file   = Thyroid DISEASE (Tc-99m routine: hyper/hypo, goiter)
export const getFileInfo = (record) => {
  if (record?.scanType !== 'thyroid') return null;
  const sub = record?.scanSubType;
  if (sub === 'thyroid_scan') return { color: 'red', label: 'ملف أحمر', desc: 'Thyroid Disease' };
  if (sub === 'wbs_diagnostic' || sub === 'wbs_therapeutic') return { color: 'green', label: 'ملف أخضر', desc: 'Thyroid Cancer' };
  return null;
};
