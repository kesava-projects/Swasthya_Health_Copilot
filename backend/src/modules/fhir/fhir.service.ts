import { IUser } from '../users/user.model.js';
import { IDocument } from '../documents/document.model.js';
import { IObservation } from '../observations/observation.model.js';
import { IMedicationRecord } from '../medications/medication.model.js';
import { IConditionRecord } from '../conditions/condition.model.js';

export class FhirMapper {
  static toFhirPatient(user: IUser) {
    return {
      resourceType: 'Patient',
      id: user._id.toString(),
      identifier: user.mockAbhaId
        ? [
            {
              use: 'usual',
              system: 'https://healthid.ndhm.gov.in/mock-demonstration',
              value: user.mockAbhaId,
              type: {
                text: 'Mock ABHA Health ID (Demonstration Only)',
              },
            },
          ]
        : [],
      name: [
        {
          use: 'official',
          text: user.name,
        },
      ],
      gender: user.gender === 'male' || user.gender === 'female' || user.gender === 'other' ? user.gender : 'unknown',
      birthDate: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : undefined,
    };
  }

  static toFhirDocumentReference(doc: IDocument, patientId: string) {
    return {
      resourceType: 'DocumentReference',
      id: doc._id.toString(),
      status: 'current',
      subject: {
        reference: `Patient/${patientId}`,
      },
      date: doc.createdAt.toISOString(),
      description: doc.originalName,
      category: [
        {
          coding: [
            {
              system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category',
              code: doc.documentType,
              display: doc.documentType.replace('_', ' ').toUpperCase(),
            },
          ],
        },
      ],
      content: [
        {
          attachment: {
            contentType: doc.mimeType,
            size: doc.sizeBytes,
            title: doc.originalName,
          },
        },
      ],
    };
  }

  static toFhirObservation(obs: IObservation, patientId: string) {
    return {
      resourceType: 'Observation',
      id: obs._id.toString(),
      status: 'final',
      subject: {
        reference: `Patient/${patientId}`,
      },
      effectiveDateTime: obs.observationDate.toISOString(),
      code: {
        coding: obs.standardizedCode
          ? [
              {
                system: 'http://loinc.org',
                code: obs.standardizedCode,
                display: obs.testName,
              },
            ]
          : [],
        text: obs.testName,
      },
      ...(obs.valueNumeric !== undefined && obs.valueNumeric !== null
        ? {
            valueQuantity: {
              value: obs.valueNumeric,
              unit: obs.unit || '',
              system: 'http://unitsofmeasure.org',
            },
          }
        : {
            valueString: obs.valueString,
          }),
      referenceRange: obs.referenceRangeLow !== undefined || obs.referenceRangeHigh !== undefined
        ? [
            {
              low: obs.referenceRangeLow ? { value: obs.referenceRangeLow, unit: obs.unit } : undefined,
              high: obs.referenceRangeHigh ? { value: obs.referenceRangeHigh, unit: obs.unit } : undefined,
              text: obs.referenceRangeString,
            },
          ]
        : [],
      interpretation: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
              code: obs.interpretation === 'NORMAL' ? 'N' : obs.interpretation === 'HIGH' ? 'H' : obs.interpretation === 'LOW' ? 'L' : 'A',
              display: obs.interpretation,
            },
          ],
        },
      ],
    };
  }

  static toFhirMedicationRequest(med: IMedicationRecord, patientId: string) {
    return {
      resourceType: 'MedicationRequest',
      id: med._id.toString(),
      status: med.isCurrent ? 'active' : 'stopped',
      intent: 'order',
      subject: {
        reference: `Patient/${patientId}`,
      },
      authoredOn: med.prescribedDate.toISOString(),
      medicationCodeableConcept: {
        text: `${med.medicineName} ${med.dosage || ''}`.trim(),
      },
      dosageInstruction: [
        {
          text: `Frequency: ${med.frequency || 'As advised'}, Route: ${med.route || 'Oral'}, Instructions: ${med.instructions || 'None'}`,
        },
      ],
    };
  }

  static toFhirCondition(cond: IConditionRecord, patientId: string) {
    return {
      resourceType: 'Condition',
      id: cond._id.toString(),
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: cond.status === 'active' ? 'active' : cond.status === 'resolved' ? 'resolved' : 'recurrence',
          },
        ],
      },
      code: {
        coding: cond.icd10Code
          ? [
              {
                system: 'http://hl7.org/fhir/sid/icd-10',
                code: cond.icd10Code,
                display: cond.conditionName,
              },
            ]
          : [],
        text: cond.conditionName,
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      recordedDate: cond.diagnosedDate.toISOString(),
    };
  }
}
