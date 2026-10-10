import fs from 'fs';
import path from 'path';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { DocumentModel } from '../src/modules/documents/document.model.js';
import { ExtractionModel } from '../src/modules/extractions/extraction.model.js';
import { ObservationModel } from '../src/modules/observations/observation.model.js';
import { ConversationModel } from '../src/modules/chatbot/chat.model.js';
import { ReminderModel } from '../src/modules/reminders/reminder.model.js';
import { storageService } from '../src/services/storage/storage.adapter.js';

const app = createApp();

describe('Swasthya Copilot Backend API Test Suite', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/swasthya_copilot_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    // Clean collections and database GridFS
    await Promise.all([
      UserModel.deleteMany({}),
      DocumentModel.deleteMany({}),
      ExtractionModel.deleteMany({}),
      ObservationModel.deleteMany({}),
      ConversationModel.deleteMany({}),
      ReminderModel.deleteMany({}),
    ]);
    if (mongoose.connection.db) {
      await mongoose.connection.db.collection('uploads.files').deleteMany({});
      await mongoose.connection.db.collection('uploads.chunks').deleteMany({});
    }
  });

  afterAll(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      DocumentModel.deleteMany({}),
      ExtractionModel.deleteMany({}),
      ObservationModel.deleteMany({}),
      ConversationModel.deleteMany({}),
      ReminderModel.deleteMany({}),
    ]);
    if (mongoose.connection.db) {
      await mongoose.connection.db.collection('uploads.files').deleteMany({});
      await mongoose.connection.db.collection('uploads.chunks').deleteMany({});
      await mongoose.connection.db.collection('messages').deleteMany({});
      await mongoose.connection.db.collection('summaries').deleteMany({});
      await mongoose.connection.db.collection('healthtimelineevents').deleteMany({});
      await mongoose.connection.db.collection('auditlogs').deleteMany({});
      await mongoose.connection.db.collection('documentprocessingjobs').deleteMany({});
    }
    await mongoose.disconnect();
  });

  describe('1. Authentication & User Registration', () => {
    it('should register a new user successfully and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Ananya Rao',
          email: 'ananya@example.com',
          password: 'Password@123',
          gender: 'female',
          bloodGroup: 'O+',
          preferredLanguage: 'en',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('ananya@example.com');
      expect(res.body.user.mockAbhaId).toMatch(/^MOCK-/);

      user1Token = res.body.token;
      user1Id = res.body.user.id;
    });

    it('should reject registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Ananya Duplicate',
          email: 'ananya@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });

    it('should authenticate user via login endpoint', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'ananya@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'ananya@example.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should register User 2 for cross-user isolation tests', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Vikram Singh',
          email: 'vikram@example.com',
          password: 'Password@456',
          gender: 'male',
          bloodGroup: 'A+',
        });

      expect(res.status).toBe(201);
      user2Token = res.body.token;
      user2Id = res.body.user.id;
    });
  });

  describe('2. Document Upload & Security Verification', () => {
    let uploadedDocId: string;

    it('should reject upload without authentication token', async () => {
      const fakePdfBuffer = Buffer.from('%PDF-1.4 mock pdf content');
      const res = await request(app)
        .post('/api/documents/upload')
        .attach('file', fakePdfBuffer, 'test.pdf');

      expect(res.status).toBe(401);
    });

    it('should reject file with spoofed MIME type (invalid magic bytes)', async () => {
      const maliciousExecutableBuffer = Buffer.from('MZ fake exe content');
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', maliciousExecutableBuffer, 'malicious.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('File content signature does not match claimed MIME type');
    });

    it('should accept a genuine synthetic PDF upload with %PDF header', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Synthetic Lab Report) >>\nendobj\ntrailer\n<<>>\n%%EOF');
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('documentType', 'lab_report')
        .attach('file', validPdfBuffer, 'cbc_test_report.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.document.id).toBeDefined();
      expect(res.body.document.processingStatus).toBe('queued');

      uploadedDocId = res.body.document.id;
    });

    it('should prevent User 2 from downloading or accessing User 1 document (IDOR protection)', async () => {
      const res = await request(app)
        .get(`/api/documents/${uploadedDocId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should verify document is stored directly in database GridFS and not in project files', async () => {
      const doc = await DocumentModel.findById(uploadedDocId);
      expect(doc).toBeDefined();

      // Check document file is stored in MongoDB GridFS
      const hasDbFile = await storageService.hasFile(doc!.storedFilename);
      expect(hasDbFile).toBe(true);

      const buffer = await storageService.getFileBuffer(doc!.storedFilename);
      expect(buffer.toString()).toContain('%PDF-1.4');

      // Crucial verification: file must NOT be stored on project filesystem
      const diskPath = path.join(process.cwd(), 'uploads', doc!.storedFilename);
      expect(fs.existsSync(diskPath)).toBe(false);
    });

    it('should allow User 1 to download/preview the document directly from database GridFS', async () => {
      const res = await request(app)
        .get(`/api/documents/${uploadedDocId}/download`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body).toBeDefined();
    });
  });

  describe('3. Extraction Review & Confirmation Workflow', () => {
    let docId: string;

    beforeAll(async () => {
      const doc = await DocumentModel.create({
        userId: new mongoose.Types.ObjectId(user1Id),
        originalName: 'test_glucose_report.pdf',
        storedFilename: 'test_glucose_report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        documentType: 'lab_report',
        documentDate: new Date('2024-05-10'),
        processingStatus: 'awaiting_review',
      });
      docId = doc._id.toString();

      await ExtractionModel.create({
        documentId: doc._id,
        userId: new mongoose.Types.ObjectId(user1Id),
        pages: [{ pageNumber: 1, text: 'Fasting Glucose: 110 mg/dL (Ref: 70-100)', engine: 'tesseract' }],
        structuredData: {
          documentType: 'lab_report',
          observations: [
            {
              testName: 'Fasting Blood Sugar',
              valueNumeric: 110,
              valueString: '110',
              unit: 'mg/dL',
              referenceRangeLow: 70,
              referenceRangeHigh: 100,
              referenceRangeString: '70 - 100 mg/dL',
              isAbnormal: true,
              pageNumber: 1,
              sourceText: 'Fasting Glucose: 110 mg/dL',
              confidence: 'high',
            },
          ],
          medications: [],
          conditions: [],
          allergies: [],
          followUps: [],
          missingInformation: [],
          uncertainInformation: [],
        },
        reviewStatus: 'unreviewed',
      });
    });

    it('should allow user to fetch the extracted fields and source page data', async () => {
      const res = await request(app)
        .get(`/api/extractions/${docId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.extraction.structuredData.observations.length).toBe(1);
      expect(res.body.extraction.structuredData.observations[0].testName).toBe('Fasting Blood Sugar');
    });

    it('should confirm extraction and promote verified records to Observations & Timeline', async () => {
      const res = await request(app)
        .post(`/api/extractions/${docId}/confirm`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify observation was created in database
      const obs = await ObservationModel.findOne({ userId: user1Id, testName: 'Fasting Blood Sugar' });
      expect(obs).toBeDefined();
      expect(obs?.valueNumeric).toBe(110);
      expect(obs?.verificationStatus).toBe('user_confirmed');
    });
  });

  describe('4. RAG Chatbot & Cross-User Context Isolation', () => {
    let convId: string;

    it('should create a chat conversation for User 1', async () => {
      const res = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'My Lab Results Inquiry' });

      expect(res.status).toBe(201);
      convId = res.body.conversation._id;
    });

    it('should answer user question grounded in their confirmed medical records', async () => {
      const res = await request(app)
        .post(`/api/chat/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: 'What was my Fasting Blood Sugar value in my lab report?',
          language: 'en',
        });

      expect(res.status).toBe(200);
      expect(res.body.assistantMessage).toBeDefined();
      expect(res.body.assistantMessage.citations).toBeDefined();
      expect(res.body.assistantMessage.text).toContain('Fasting Blood Sugar');
    }, 30000);

    it('should reject User 2 from sending message to User 1 conversation', async () => {
      const res = await request(app)
        .post(`/api/chat/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ text: 'Tell me about their results' });

      expect(res.status).toBe(404);
    });
  });

  describe('5. FHIR R4 Bundle Export', () => {
    it('should export valid HL7 FHIR R4 Bundle for authenticated patient', async () => {
      const res = await request(app)
        .get('/api/fhir/export')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.resourceType).toBe('Bundle');
      expect(res.body.type).toBe('collection');
      expect(Array.isArray(res.body.entry)).toBe(true);

      const patientEntry = res.body.entry.find((e: any) => e.resource.resourceType === 'Patient');
      expect(patientEntry).toBeDefined();
      expect(patientEntry.resource.name[0].text).toBe('Ananya Rao');

      const observationEntry = res.body.entry.find((e: any) => e.resource.resourceType === 'Observation');
      expect(observationEntry).toBeDefined();
      expect(observationEntry.resource.code.text).toBe('Fasting Blood Sugar');
    });
  });

  describe('6. User-Confirmed Reminders System', () => {
    let reminderId: string;

    it('should create a confirmed appointment reminder', async () => {
      const targetTime = new Date();
      targetTime.setDate(targetTime.getDate() + 5);

      const res = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Consultation with Endocrinologist',
          reminderType: 'appointment',
          scheduledTime: targetTime.toISOString(),
          notes: 'Review blood sugar trends',
        });

      expect(res.status).toBe(201);
      expect(res.body.reminder.title).toBe('Consultation with Endocrinologist');
      expect(res.body.reminder.status).toBe('pending');
      reminderId = res.body.reminder._id;
    });

    it('should update reminder status to completed', async () => {
      const res = await request(app)
        .patch(`/api/reminders/${reminderId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.reminder.status).toBe('completed');
    });
  });

  describe('7. Longitudinal Health Overview & Patient Summary', () => {
    it('should generate or fetch longitudinal patient summary', async () => {
      const res = await request(app)
        .get('/api/summaries/patient')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.summaryType).toBe('patient_overall');
      expect(res.body.summary.title).toBeDefined();
      expect(res.body.summary.simpleExplanation).toBeDefined();
    }, 15000);
  });
});
