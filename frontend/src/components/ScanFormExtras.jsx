import PreviousScanBanner from './PreviousScanBanner';
import ThyroidContrastAlert from './ThyroidContrastAlert';
import ScanClinicalSections from './ScanClinicalSections';
import MobileFileUpload from './MobileFileUpload';
import './ScanClinicalSections.css';

const ScanFormExtras = ({
  patientId,
  scanType,
  formData,
  setFormData,
  onFileChange,
  files = [],
  showClinical = true,
  showUpload = true,
}) => {
  const user = JSON.parse(localStorage.getItem('auth_user') || '{}');

  if (!patientId) return null;

  return (
    <div className="scan-form-extras">
      <PreviousScanBanner patientId={patientId} scanType={scanType} currentScanData={formData} />
      {scanType === 'thyroid' && <ThyroidContrastAlert contrastCTDate={formData.contrastCTDate} />}
      {showClinical && (
        <ScanClinicalSections
          role={user.role}
          scanType={scanType}
          formData={formData}
          onChange={setFormData}
        />
      )}
      {showUpload && onFileChange && (
        <MobileFileUpload files={files} onChange={onFileChange} />
      )}
    </div>
  );
};

export default ScanFormExtras;
