import { AlertTriangle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import './ThyroidContrastAlert.css';

const ThyroidContrastAlert = ({ contrastCTDate }) => {
  if (!contrastCTDate) return null;

  const ctDate = new Date(contrastCTDate);
  if (Number.isNaN(ctDate.getTime())) return null;

  const daysSince = differenceInDays(new Date(), ctDate);
  if (daysSince < 0 || daysSince > 42) return null;

  const isCritical = daysSince < 28;

  return (
    <div className={`thyroid-ct-alert ${isCritical ? 'critical' : 'warning'}`} dir="rtl">
      <AlertTriangle size={22} />
      <div>
        <strong>{isCritical ? 'تحذير: الفحص قد يُفسد!' : 'تنبيه'}</strong>
        <p>
          أشعة مقطعية بالصبغة بتاريخ {ctDate.toLocaleDateString('ar-EG')} —
          منذ {daysSince} يوماً.
          {isCritical
            ? ' يجب أن تمر 4–6 أسابيع على الأقل قبل مسح الغدة.'
            : ' يُفضّل التأكد من مرور 4–6 أسابيع.'}
        </p>
      </div>
    </div>
  );
};

export default ThyroidContrastAlert;
