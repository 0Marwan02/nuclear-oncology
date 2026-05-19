import { Upload, Camera } from 'lucide-react';
import './MobileFileUpload.css';

const MobileFileUpload = ({ label = 'رفع ملف / صورة', accept = 'image/*,.pdf', multiple = true, onChange, files = [] }) => {
  return (
    <div className="mobile-file-upload" dir="rtl">
      <label className="upload-label">{label}</label>
      <div className="upload-buttons">
        <label className="upload-btn">
          <Upload size={18} />
          <span>اختيار ملف</span>
          <input type="file" accept={accept} multiple={multiple} onChange={onChange} className="hidden-input" />
        </label>
        <label className="upload-btn camera">
          <Camera size={18} />
          <span>كاميرا</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onChange}
            className="hidden-input"
          />
        </label>
      </div>
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={i}>{f.name || `ملف ${i + 1}`}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MobileFileUpload;
