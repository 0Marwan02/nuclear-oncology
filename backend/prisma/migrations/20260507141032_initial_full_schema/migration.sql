BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [hospitalId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_hospitalId_key] UNIQUE NONCLUSTERED ([hospitalId])
);

-- CreateTable
CREATE TABLE [dbo].[Patient] (
    [id] NVARCHAR(1000) NOT NULL,
    [nationalId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [gender] NVARCHAR(1000) NOT NULL,
    [birthDate] DATETIME2 NOT NULL,
    [phone] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000) NOT NULL,
    [bloodType] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Patient_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Patient_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Patient_nationalId_key] UNIQUE NONCLUSTERED ([nationalId])
);

-- CreateTable
CREATE TABLE [dbo].[MedicalCase] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [diagnosis] NVARCHAR(1000) NOT NULL,
    [cancerType] NVARCHAR(1000) NOT NULL,
    [cancerStage] NVARCHAR(1000) NOT NULL,
    [protocolType] NVARCHAR(1000) NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MedicalCase_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MedicalCase_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Visit] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [caseId] NVARCHAR(1000) NOT NULL,
    [visitDate] DATETIME2 NOT NULL CONSTRAINT [Visit_visitDate_df] DEFAULT CURRENT_TIMESTAMP,
    [weight] FLOAT(53),
    [bloodPressure] NVARCHAR(1000),
    [temperature] FLOAT(53),
    [generalCondition] NVARCHAR(1000),
    [doctorNotes] NVARCHAR(1000),
    [nurseNotes] NVARCHAR(1000),
    [recordedBy] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Visit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LabResult] (
    [id] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000) NOT NULL,
    [testName] NVARCHAR(1000) NOT NULL,
    [resultValue] NVARCHAR(1000) NOT NULL,
    [unit] NVARCHAR(1000),
    [referenceRange] NVARCHAR(1000),
    [fileUrl] NVARCHAR(1000),
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [LabResult_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LabResult_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ImagingResult] (
    [id] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000) NOT NULL,
    [imagingType] NVARCHAR(1000) NOT NULL,
    [bodyRegion] NVARCHAR(1000) NOT NULL,
    [findings] NVARCHAR(1000),
    [fileUrl] NVARCHAR(1000),
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [ImagingResult_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ImagingResult_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Medication] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000),
    [drugName] NVARCHAR(1000) NOT NULL,
    [dose] NVARCHAR(1000) NOT NULL,
    [frequency] NVARCHAR(1000) NOT NULL,
    [route] NVARCHAR(1000) NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Medication_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Medication_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RadiationDose] (
    [id] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000) NOT NULL,
    [caseId] NVARCHAR(1000) NOT NULL,
    [isotopeType] NVARCHAR(1000) NOT NULL,
    [doseMCi] FLOAT(53) NOT NULL,
    [cumulativeDose] FLOAT(53) NOT NULL,
    [recordedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RadiationDose_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RadiationDose_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tableName] NVARCHAR(1000) NOT NULL,
    [recordId] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [oldValues] NVARCHAR(1000),
    [newValues] NVARCHAR(1000),
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [AuditLog_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClinicGreenFile] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000),
    [caseId] NVARCHAR(1000),
    [followUpDate] DATETIME2 NOT NULL CONSTRAINT [ClinicGreenFile_followUpDate_df] DEFAULT CURRENT_TIMESTAMP,
    [thyroglobulin] FLOAT(53),
    [antiTg] FLOAT(53),
    [tsh] FLOAT(53),
    [ft3] FLOAT(53),
    [ft4] FLOAT(53),
    [radioiodineUptake] NVARCHAR(1000),
    [wholeBodyScanResult] NVARCHAR(1000),
    [neckUltrasound] NVARCHAR(1000),
    [stimulatedTg] FLOAT(53),
    [treatmentPlan] NVARCHAR(1000),
    [responseToTherapy] NVARCHAR(1000),
    [recurrenceSigns] NVARCHAR(1000),
    [physicianNotes] NVARCHAR(1000),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClinicGreenFile_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ClinicGreenFile_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClinicRedFile] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000),
    [diseaseType] NVARCHAR(1000) NOT NULL,
    [followUpDate] DATETIME2 NOT NULL CONSTRAINT [ClinicRedFile_followUpDate_df] DEFAULT CURRENT_TIMESTAMP,
    [tsh] FLOAT(53),
    [ft3] FLOAT(53),
    [ft4] FLOAT(53),
    [antiTpo] FLOAT(53),
    [antiTg] FLOAT(53),
    [trAb] FLOAT(53),
    [thyroidVolume] FLOAT(53),
    [rightLobeSize] NVARCHAR(1000),
    [leftLobeSize] NVARCHAR(1000),
    [nodulePresence] BIT NOT NULL CONSTRAINT [ClinicRedFile_nodulePresence_df] DEFAULT 0,
    [noduleDetails] NVARCHAR(1000),
    [symptoms] NVARCHAR(1000),
    [currentMedication] NVARCHAR(1000),
    [doseAdjustment] NVARCHAR(1000),
    [physicianNotes] NVARCHAR(1000),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClinicRedFile_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ClinicRedFile_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScanPETCT] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000),
    [referralReason] NVARCHAR(1000),
    [fdgDoseMCi] FLOAT(53),
    [injectionTime] DATETIME2,
    [scanTime] DATETIME2,
    [bloodSugar] FLOAT(53),
    [uptakeTime] INT,
    [bodyRegion] NVARCHAR(1000),
    [suvMax] FLOAT(53),
    [suvMean] FLOAT(53),
    [lesionLocation] NVARCHAR(1000),
    [lesionSize] NVARCHAR(1000),
    [metastasisSign] BIT NOT NULL CONSTRAINT [ScanPETCT_metastasisSign_df] DEFAULT 0,
    [metastasisDetails] NVARCHAR(1000),
    [impression] NVARCHAR(1000),
    [physicianNotes] NVARCHAR(1000),
    [fileUrl] NVARCHAR(1000),
    [performedBy] NVARCHAR(1000) NOT NULL,
    [reportedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ScanPETCT_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ScanPETCT_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScanPSMAPETCT] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000),
    [psaLevel] FLOAT(53),
    [gleasonScore] NVARCHAR(1000),
    [ga68DoseMCi] FLOAT(53),
    [injectionTime] DATETIME2,
    [scanTime] DATETIME2,
    [uptakeTime] INT,
    [prostateBedRecurrence] BIT NOT NULL CONSTRAINT [ScanPSMAPETCT_prostateBedRecurrence_df] DEFAULT 0,
    [lymphNodeInvolvement] BIT NOT NULL CONSTRAINT [ScanPSMAPETCT_lymphNodeInvolvement_df] DEFAULT 0,
    [boneMetastasis] BIT NOT NULL CONSTRAINT [ScanPSMAPETCT_boneMetastasis_df] DEFAULT 0,
    [visceralMetastasis] BIT NOT NULL CONSTRAINT [ScanPSMAPETCT_visceralMetastasis_df] DEFAULT 0,
    [lesionLocations] NVARCHAR(1000),
    [psmaExpression] NVARCHAR(1000),
    [impression] NVARCHAR(1000),
    [physicianNotes] NVARCHAR(1000),
    [fileUrl] NVARCHAR(1000),
    [performedBy] NVARCHAR(1000) NOT NULL,
    [reportedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ScanPSMAPETCT_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ScanPSMAPETCT_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScanThyroid] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000),
    [isotopeType] NVARCHAR(1000) NOT NULL,
    [isotopeDoseMCi] FLOAT(53),
    [injectionTime] DATETIME2,
    [scanTime] DATETIME2,
    [tshLevel] FLOAT(53),
    [withdrawalDays] INT,
    [rightLobeUptake] FLOAT(53),
    [leftLobeUptake] FLOAT(53),
    [totalUptake] FLOAT(53),
    [rightLobeSize] NVARCHAR(1000),
    [leftLobeSize] NVARCHAR(1000),
    [isthmusSize] NVARCHAR(1000),
    [glandPosition] NVARCHAR(1000),
    [hotNodules] NVARCHAR(1000),
    [coldNodules] NVARCHAR(1000),
    [diffuseUptake] BIT NOT NULL CONSTRAINT [ScanThyroid_diffuseUptake_df] DEFAULT 0,
    [heterogenousUptake] BIT NOT NULL CONSTRAINT [ScanThyroid_heterogenousUptake_df] DEFAULT 0,
    [diagramData] NVARCHAR(1000),
    [impression] NVARCHAR(1000),
    [physicianNotes] NVARCHAR(1000),
    [fileUrl] NVARCHAR(1000),
    [performedBy] NVARCHAR(1000) NOT NULL,
    [reportedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ScanThyroid_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ScanThyroid_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScanBone] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000),
    [primaryCancer] NVARCHAR(1000),
    [tc99mDoseMCi] FLOAT(53),
    [injectionTime] DATETIME2,
    [scanTime] DATETIME2,
    [uptakeTime] INT,
    [skeletalMetastasis] BIT NOT NULL CONSTRAINT [ScanBone_skeletalMetastasis_df] DEFAULT 0,
    [metastasisLocations] NVARCHAR(1000),
    [extraosseousUptake] BIT NOT NULL CONSTRAINT [ScanBone_extraosseousUptake_df] DEFAULT 0,
    [extraosseousLocations] NVARCHAR(1000),
    [renalVisualization] BIT NOT NULL CONSTRAINT [ScanBone_renalVisualization_df] DEFAULT 1,
    [degenerativeChanges] BIT NOT NULL CONSTRAINT [ScanBone_degenerativeChanges_df] DEFAULT 0,
    [traumaSites] NVARCHAR(1000),
    [impression] NVARCHAR(1000),
    [physicianNotes] NVARCHAR(1000),
    [fileUrl] NVARCHAR(1000),
    [performedBy] NVARCHAR(1000) NOT NULL,
    [reportedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ScanBone_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ScanBone_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScanRenal] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000),
    [scanType] NVARCHAR(1000) NOT NULL,
    [tc99mDoseMCi] FLOAT(53),
    [injectionTime] DATETIME2,
    [scanTime] DATETIME2,
    [furosemideGiven] BIT NOT NULL CONSTRAINT [ScanRenal_furosemideGiven_df] DEFAULT 0,
    [furosemideTime] DATETIME2,
    [aceInhibitorGiven] BIT NOT NULL CONSTRAINT [ScanRenal_aceInhibitorGiven_df] DEFAULT 0,
    [rightKidneyGFR] FLOAT(53),
    [leftKidneyGFR] FLOAT(53),
    [rightSplitFunction] FLOAT(53),
    [leftSplitFunction] FLOAT(53),
    [rightT1_2] FLOAT(53),
    [leftT1_2] FLOAT(53),
    [rightTmax] FLOAT(53),
    [leftTmax] FLOAT(53),
    [obstructionSign] BIT NOT NULL CONSTRAINT [ScanRenal_obstructionSign_df] DEFAULT 0,
    [refluxSign] BIT NOT NULL CONSTRAINT [ScanRenal_refluxSign_df] DEFAULT 0,
    [corticalScarring] BIT NOT NULL CONSTRAINT [ScanRenal_corticalScarring_df] DEFAULT 0,
    [impression] NVARCHAR(1000),
    [physicianNotes] NVARCHAR(1000),
    [fileUrl] NVARCHAR(1000),
    [performedBy] NVARCHAR(1000) NOT NULL,
    [reportedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ScanRenal_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ScanRenal_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScanGastric] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000),
    [mealType] NVARCHAR(1000),
    [tc99mDoseMCi] FLOAT(53),
    [ingestionTime] DATETIME2,
    [scanStartTime] DATETIME2,
    [scanDuration] INT,
    [imageInterval] INT,
    [halfEmptyingTime] FLOAT(53),
    [retention1h] FLOAT(53),
    [retention2h] FLOAT(53),
    [retention4h] FLOAT(53),
    [delayedEmptying] BIT NOT NULL CONSTRAINT [ScanGastric_delayedEmptying_df] DEFAULT 0,
    [rapidEmptying] BIT NOT NULL CONSTRAINT [ScanGastric_rapidEmptying_df] DEFAULT 0,
    [refluxSign] BIT NOT NULL CONSTRAINT [ScanGastric_refluxSign_df] DEFAULT 0,
    [aspirationSign] BIT NOT NULL CONSTRAINT [ScanGastric_aspirationSign_df] DEFAULT 0,
    [impression] NVARCHAR(1000),
    [physicianNotes] NVARCHAR(1000),
    [fileUrl] NVARCHAR(1000),
    [performedBy] NVARCHAR(1000) NOT NULL,
    [reportedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ScanGastric_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ScanGastric_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Patient] ADD CONSTRAINT [Patient_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MedicalCase] ADD CONSTRAINT [MedicalCase_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MedicalCase] ADD CONSTRAINT [MedicalCase_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Visit] ADD CONSTRAINT [Visit_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Visit] ADD CONSTRAINT [Visit_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[MedicalCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Visit] ADD CONSTRAINT [Visit_recordedBy_fkey] FOREIGN KEY ([recordedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LabResult] ADD CONSTRAINT [LabResult_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LabResult] ADD CONSTRAINT [LabResult_uploadedBy_fkey] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImagingResult] ADD CONSTRAINT [ImagingResult_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImagingResult] ADD CONSTRAINT [ImagingResult_uploadedBy_fkey] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Medication] ADD CONSTRAINT [Medication_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Medication] ADD CONSTRAINT [Medication_uploadedBy_fkey] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RadiationDose] ADD CONSTRAINT [RadiationDose_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RadiationDose] ADD CONSTRAINT [RadiationDose_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[MedicalCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RadiationDose] ADD CONSTRAINT [RadiationDose_recordedBy_fkey] FOREIGN KEY ([recordedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicGreenFile] ADD CONSTRAINT [ClinicGreenFile_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicGreenFile] ADD CONSTRAINT [ClinicGreenFile_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicGreenFile] ADD CONSTRAINT [ClinicGreenFile_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[MedicalCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicGreenFile] ADD CONSTRAINT [ClinicGreenFile_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicRedFile] ADD CONSTRAINT [ClinicRedFile_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicRedFile] ADD CONSTRAINT [ClinicRedFile_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicRedFile] ADD CONSTRAINT [ClinicRedFile_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanPETCT] ADD CONSTRAINT [ScanPETCT_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanPETCT] ADD CONSTRAINT [ScanPETCT_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanPETCT] ADD CONSTRAINT [ScanPETCT_performedBy_fkey] FOREIGN KEY ([performedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanPETCT] ADD CONSTRAINT [ScanPETCT_reportedBy_fkey] FOREIGN KEY ([reportedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanPSMAPETCT] ADD CONSTRAINT [ScanPSMAPETCT_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanPSMAPETCT] ADD CONSTRAINT [ScanPSMAPETCT_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanPSMAPETCT] ADD CONSTRAINT [ScanPSMAPETCT_performedBy_fkey] FOREIGN KEY ([performedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanPSMAPETCT] ADD CONSTRAINT [ScanPSMAPETCT_reportedBy_fkey] FOREIGN KEY ([reportedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanThyroid] ADD CONSTRAINT [ScanThyroid_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanThyroid] ADD CONSTRAINT [ScanThyroid_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanThyroid] ADD CONSTRAINT [ScanThyroid_performedBy_fkey] FOREIGN KEY ([performedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanThyroid] ADD CONSTRAINT [ScanThyroid_reportedBy_fkey] FOREIGN KEY ([reportedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanBone] ADD CONSTRAINT [ScanBone_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanBone] ADD CONSTRAINT [ScanBone_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanBone] ADD CONSTRAINT [ScanBone_performedBy_fkey] FOREIGN KEY ([performedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanBone] ADD CONSTRAINT [ScanBone_reportedBy_fkey] FOREIGN KEY ([reportedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanRenal] ADD CONSTRAINT [ScanRenal_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanRenal] ADD CONSTRAINT [ScanRenal_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanRenal] ADD CONSTRAINT [ScanRenal_performedBy_fkey] FOREIGN KEY ([performedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanRenal] ADD CONSTRAINT [ScanRenal_reportedBy_fkey] FOREIGN KEY ([reportedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanGastric] ADD CONSTRAINT [ScanGastric_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanGastric] ADD CONSTRAINT [ScanGastric_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanGastric] ADD CONSTRAINT [ScanGastric_performedBy_fkey] FOREIGN KEY ([performedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScanGastric] ADD CONSTRAINT [ScanGastric_reportedBy_fkey] FOREIGN KEY ([reportedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
