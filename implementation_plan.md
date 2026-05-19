# خطة تنفيذ — مركز الإشعاع النووي

> المهام مرتبة من **الأصعب → الأسهل**.  
> ✅ = مكتمل | 🔶 = جزئي | ⬜ = لم يبدأ

آخر تحديث: 2026-05-16

---

## المرحلة أ — الأصعب (بنية سريرية كاملة)

| # | المهمة | الحالة |
|---|--------|--------|
| A1 | إكمال حقول PET/CT السريرية — Schema + API + UI | ✅ Schema + API + `ScanClinicalSections` + `ScanFormExtras` |
| A2 | إكمال PSMA (Total/Free PSA + تاريخ قراءات) | ✅ |
| A3 | إكمال Thyroid Scan (أعراض، T3/T4، CT بالصبغة، أدوية) | ✅ + `ThyroidContrastAlert` |
| A4 | إكمال Bone / Renal / Gastric بالحقول | ✅ |
| A5 | وحدة Meckel's Scan (Model + API + صفحة) | ✅ |
| A6 | تقسيم الشيتات حسب الدور + Backend field guards | ✅ `ScanClinicalSections` + `roleFieldFilter` + `withRoleClinical` |
| A7 | حقول التحضير المشتركة على كل الفحوصات | ✅ |
| A8 | نظام مواعيد المتابعة (شهر / 6 شهور) | ✅ `Appointment` + API + لوحة الطبيب |
| A9 | Reception Wizard: تسجيل → فتح شيت `Registered` | ✅ `ReceptionEncounterWizard` |

---

## المرحلة ب — متوسطة (تدفق العمل والربط)

| # | المهمة | الحالة |
|---|--------|--------|
| B1 | حفظ بيانات التمريض عند `Prepared` | ✅ |
| B2 | حفظ بيانات الفني عند `Scanned` | ✅ |
| B3 | حفظ تقرير الطبيب عند `Completed` | ✅ |
| B4 | API `PUT /workflow/:type/:id/advance` | ✅ |
| B5 | ربط `PreviousScanBanner` في كل صفحات الفحوصات | ✅ عبر `ScanFormExtras` |
| B6 | `RoleRouteGuard` | ✅ |
| B7 | Middleware أدوار على endpoints | ✅ `requireRole` + `roleFieldFilter` |
| B8 | زيارة بدون `medicalCase` إلزامي | ✅ `caseId` اختياري |
| B9 | حقول المريض: `maritalStatus`, `referringDoctor` | ✅ |
| B10 | رفع ملفات من الموبايل (`capture`) | ✅ `MobileFileUpload` (واجهة؛ رفع الملف مع multipart عند الحاجة) |

---

## المرحلة ج — أسهل (إصلاحات وتلميع)

| # | المهمة | الحالة |
|---|--------|--------|
| C1 | تفعيل `app.use('/api/workflow', workflowRoutes)` | ✅ |
| C2 | إصلاح `/appointments` | ✅ |
| C3 | `AdminUsers`: فك الرقم القومي | ✅ |
| C4 | عربية موحّدة (استقبال، تمريض، فني، طبيب) | ✅ لوحات العمل الرئيسية |
| C5 | شريط تقدم حالة المريض | ✅ `WorkflowProgress` في التمريض والفني والطبيب |
| C6 | JWT: رفض `isActive: false` | ✅ |
| C7 | Audit log لانتقالات الـ workflow | ✅ |

---

## ملفات جديدة / محدّثة

| ملف | وصف |
|-----|-----|
| `IMPLEMENTATION_PLAN.md` | هذه الخطة |
| `backend/src/controllers/workflowController.js` | تقدم الحالة + حفظ البيانات |
| `backend/src/middleware/roleFieldFilter.js` | فلترة الحقول حسب الدور |
| `backend/src/controllers/receptionController.js` | فتح فحص/عيادة |
| `backend/src/controllers/appointmentController.js` | مواعيد المتابعة |
| `frontend/src/components/ReceptionEncounterWizard.jsx` | معالج الاستقبال |
| `frontend/src/components/RoleRouteGuard.jsx` | حماية المسارات |
| `frontend/src/components/WorkflowProgress.jsx` | شريط الحالة |
| `frontend/src/components/ScanClinicalSections.jsx` | أقسام حسب الدور |
| `frontend/src/components/ScanFormExtras.jsx` | بانر + تنبيهات + سريري + رفع |
| `frontend/src/pages/ScanMeckel.jsx` | فحص Meckel |

---

## مرجع

- `flow.md` — المتطلبات المختصرة
- `مركز الإشعاع النووي.txt` — المواصفات التفصيلية
- `system_review_and_improvements.md` — مراجعة سابقة
