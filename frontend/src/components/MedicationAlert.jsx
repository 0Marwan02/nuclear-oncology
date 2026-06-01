import { AlertTriangle } from 'lucide-react';
import './MedicationAlert.css';

// Substances that interfere with radioactive iodine thyroid studies
// (التاريخ الدوائي). Matched case-insensitively against the free-text field,
// in both Arabic and English/transliteration.
const INTERFERING = [
  { match: ['كاربيمازول', 'carbimazole', 'methimazole', 'ميثيمازول'], label: 'مضاد للدرقية (كاربيمازول/ميثيمازول)' },
  { match: ['ليفوثيروكسين', 'levothyroxine', 'eltroxin', 'التروكسين', 'thyroxine', 'ثيروكسين'], label: 'هرمون درقي (ليفوثيروكسين/التروكسين)' },
  { match: ['كحة', 'cough', 'سعال', 'iodine', 'يود', 'اليود', 'amiodarone', 'أميودارون', 'expectorant', 'مقشع'], label: 'يحتوي يود (شراب كحة/أميودارون)' },
  { match: ['contrast', 'صبغة', 'تباين'], label: 'صبغة تباين حديثة' },
];

const MedicationAlert = ({ medications = '', scanType }) => {
  if (scanType !== 'thyroid') return null;
  const text = String(medications || '').toLowerCase();
  if (!text.trim()) return null;

  const hits = INTERFERING.filter((g) => g.match.some((m) => text.includes(m.toLowerCase())));
  if (hits.length === 0) return null;

  return (
    <div className="medication-alert" dir="rtl">
      <AlertTriangle size={22} />
      <div>
        <strong>تنبيه دوائي: أدوية قد تتداخل مع اليود المشع</strong>
        <ul>
          {hits.map((h) => (
            <li key={h.label}>{h.label}</li>
          ))}
        </ul>
        <p>يجب التأكد من إيقاف الدواء قبل الفحص بالمدة المناسبة (عادة 5 أيام للأدوية المضادة للدرقية).</p>
      </div>
    </div>
  );
};

export default MedicationAlert;
