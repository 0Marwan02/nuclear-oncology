/** أقسام سريرية مشتركة — يُعرض حسب دور المستخدم */

const ScanClinicalSections = ({ role, formData, onChange, scanType }) => {
  const isDoctor = role === 'doctor' || role === 'admin';
  const isNurse = role === 'nurse' || role === 'admin';
  const isTech = role === 'technician' || role === 'admin';

  const handle = (e) => onChange({ ...formData, [e.target.name]: e.target.value });
  const handleCheck = (e) => onChange({ ...formData, [e.target.name]: e.target.checked });

  if (!isDoctor && !isNurse && !isTech) return null;

  return (
    <div className="scan-clinical-sections" dir="rtl">
      {isDoctor && (
        <section className="clinical-section doctor-section">
          <h4>قسم الطبيب</h4>
          <div className="form-row-2">
            <div className="form-group">
              <label>الشكوى</label>
              <textarea name="complaint" value={formData.complaint || ''} onChange={handle} rows={2} />
            </div>
            <div className="form-group">
              <label>التشخيص</label>
              <input name="diagnosis" value={formData.diagnosis || ''} onChange={handle} />
            </div>
          </div>

          {scanType === 'petct' && (
            <>
              <div className="form-group">
                <label>هدف الفحص</label>
                <input name="scanPurpose" value={formData.scanPurpose || ''} onChange={handle} placeholder="Staging / Recurrence" />
              </div>
              <div className="form-group">
                <label>التاريخ الجراحي</label>
                <textarea name="surgeryHistory" value={formData.surgeryHistory || ''} onChange={handle} rows={2} />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>جلسات الكيما</label>
                  <input type="number" name="chemoSessions" value={formData.chemoSessions || ''} onChange={handle} />
                </div>
                <div className="form-group">
                  <label>آخر كيما</label>
                  <input type="date" name="lastChemoDate" value={formData.lastChemoDate || ''} onChange={handle} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>جلسات الإشعاع</label>
                  <input type="number" name="radiationSessions" value={formData.radiationSessions || ''} onChange={handle} />
                </div>
                <div className="form-group">
                  <label>آخر إشعاع</label>
                  <input type="date" name="lastRadiationDate" value={formData.lastRadiationDate || ''} onChange={handle} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>دلالات الأورام</label>
                  <input name="tumorMarkers" value={formData.tumorMarkers || ''} onChange={handle} />
                </div>
                <div className="form-group">
                  <label>وظائف الكلى</label>
                  <input name="renalFunction" value={formData.renalFunction || ''} onChange={handle} />
                </div>
              </div>
              <label className="checkbox-label">
                <input type="checkbox" name="gcsfGiven" checked={!!formData.gcsfGiven} onChange={handleCheck} /> G-CSF
              </label>
              <label className="checkbox-label">
                <input type="checkbox" name="pregnancyContraindication" checked={!!formData.pregnancyContraindication} onChange={handleCheck} /> موانع حمل
              </label>
            </>
          )}

          {scanType === 'psma' && (
            <div className="form-row-3">
              <div className="form-group">
                <label>Total PSA</label>
                <input type="number" name="totalPSA" value={formData.totalPSA || ''} onChange={handle} step="0.01" />
              </div>
              <div className="form-group">
                <label>Free PSA</label>
                <input type="number" name="freePSA" value={formData.freePSA || ''} onChange={handle} step="0.01" />
              </div>
              <div className="form-group">
                <label>سجل PSA السابق</label>
                <input name="psaHistory" value={formData.psaHistory || ''} onChange={handle} placeholder='[{"date":"2024-01","total":5.2}]' />
              </div>
            </div>
          )}

          {scanType === 'thyroid' && (
            <>
              <div className="form-group">
                <label>الأعراض (أرق، خفقان، وزن…)</label>
                <textarea name="symptoms" value={formData.symptoms || ''} onChange={handle} rows={2} />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>TSH</label>
                  <input type="number" name="tshLevel" value={formData.tshLevel || ''} onChange={handle} step="0.01" />
                </div>
                <div className="form-group">
                  <label>أيام إيقاف الدواء</label>
                  <input type="number" name="withdrawalDays" value={formData.withdrawalDays || ''} onChange={handle} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>T3</label>
                  <input type="number" name="t3Level" value={formData.t3Level || ''} onChange={handle} />
                </div>
                <div className="form-group">
                  <label>T4</label>
                  <input type="number" name="t4Level" value={formData.t4Level || ''} onChange={handle} />
                </div>
              </div>
              <div className="form-group">
                <label>تاريخ CT بالصبغة</label>
                <input type="date" name="contrastCTDate" value={formData.contrastCTDate || ''} onChange={handle} />
              </div>
              <div className="form-group">
                <label>الأدوية الحالية</label>
                <input name="currentMedications" value={formData.currentMedications || ''} onChange={handle} placeholder="كاربيمازول، ليفوثيروكسين…" />
              </div>
              <label className="checkbox-label">
                <input type="checkbox" name="medicationStopped" checked={!!formData.medicationStopped} onChange={handleCheck} />
                تم إيقاف الدواء قبل الفحص
              </label>
              {formData.medicationStopped && (
                <div className="form-group">
                  <label>ملاحظات الإيقاف</label>
                  <input name="medicationStopNotes" value={formData.medicationStopNotes || ''} onChange={handle} />
                </div>
              )}
            </>
          )}

          {scanType === 'bone' && (
            <>
              <div className="form-row-2">
                <div className="form-group">
                  <label>نوع الفحص</label>
                  <select name="scanMode" value={formData.scanMode || ''} onChange={handle}>
                    <option value="">—</option>
                    <option value="Dynamic">Dynamic</option>
                    <option value="Static">Static</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>شكوى الألم</label>
                  <input name="painComplaint" value={formData.painComplaint || ''} onChange={handle} />
                </div>
              </div>
              <div className="form-group">
                <label>مسامير / كسور / حوادث</label>
                <textarea name="hardwareHistory" value={formData.hardwareHistory || ''} onChange={handle} rows={2} />
              </div>
            </>
          )}

          {scanType === 'renal' && (
            <>
              <div className="form-group">
                <label>شكوى الكلى</label>
                <textarea name="renalComplaint" value={formData.renalComplaint || ''} onChange={handle} rows={2} placeholder="ألم جانبين، حرقان، دم في البول…" />
              </div>
              <div className="form-group">
                <label>تاريخ الغسيل الكلوي</label>
                <input name="dialysisHistory" value={formData.dialysisHistory || ''} onChange={handle} />
              </div>
              <div className="form-group">
                <label>تحليل البول / وظائف الكلى</label>
                <textarea name="urineAnalysis" value={formData.urineAnalysis || ''} onChange={handle} rows={2} />
              </div>
            </>
          )}

          {scanType === 'gastric' && (
            <>
              <div className="form-group">
                <label>الأعراض (قيء، غثيان…)</label>
                <textarea name="symptoms" value={formData.symptoms || ''} onChange={handle} rows={2} />
              </div>
              <div className="form-group">
                <label>الأمراض المزمنة</label>
                <input name="chronicDiseases" value={formData.chronicDiseases || ''} onChange={handle} />
              </div>
              <div className="form-group">
                <label>تاريخ المناظير</label>
                <input name="endoscopyHistory" value={formData.endoscopyHistory || ''} onChange={handle} />
              </div>
            </>
          )}

          {scanType === 'meckel' && (
            <div className="form-group">
              <label>تاريخ النزيف / الشكوى</label>
              <textarea name="bleedingHistory" value={formData.bleedingHistory || ''} onChange={handle} rows={2} />
            </div>
          )}
        </section>
      )}

      {isNurse && (
        <section className="clinical-section nurse-section">
          <h4>قسم التمريض</h4>
          <div className="form-row-2">
            <div className="form-group">
              <label>الوزن (كجم)</label>
              <input type="number" inputMode="decimal" name="prepWeight" value={formData.prepWeight || ''} onChange={handle} className="touch-input" />
            </div>
            <div className="form-group">
              <label>الطول (سم)</label>
              <input type="number" inputMode="decimal" name="prepHeight" value={formData.prepHeight || ''} onChange={handle} className="touch-input" />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label>سكر الدم</label>
              <input type="number" inputMode="decimal" name="prepBloodGlucose" value={formData.prepBloodGlucose || ''} onChange={handle} className="touch-input" />
            </div>
            <div className="form-group">
              <label>مكان الحقن</label>
              <select name="injectionSite" value={formData.injectionSite || ''} onChange={handle} className="touch-input">
                <option value="">اختر</option>
                <option value="right_arm">الذراع الأيمن</option>
                <option value="left_arm">الذراع الأيسر</option>
                <option value="foot">القدم</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>منع الحمل / LMP</label>
            <input name="pregnancyStatus" value={formData.pregnancyStatus || ''} onChange={handle} className="touch-input" />
          </div>
        </section>
      )}

      {isTech && (
        <section className="clinical-section tech-section">
          <h4>قسم الفني</h4>
          <div className="form-row-3">
            <div className="form-group">
              <label>الجرعة (mCi)</label>
              <input type="number" inputMode="decimal" name="doseMCi" value={formData.doseMCi || ''} onChange={handle} className="touch-input" />
            </div>
            <div className="form-group">
              <label>وقت الحقن</label>
              <input type="datetime-local" name="injectionTime" value={formData.injectionTime || ''} onChange={handle} className="touch-input" />
            </div>
            <div className="form-group">
              <label>وقت التصوير</label>
              <input type="datetime-local" name="scanTime" value={formData.scanTime || ''} onChange={handle} className="touch-input" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ScanClinicalSections;
