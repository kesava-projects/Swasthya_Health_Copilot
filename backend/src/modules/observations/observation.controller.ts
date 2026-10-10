import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { ObservationModel } from './observation.model.js';

export async function listObservations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { testName, status, abnormalOnly } = req.query;

  const query: any = { userId };
  if (testName) {
    query.testName = { $regex: String(testName), $options: 'i' };
  }
  if (status) {
    query.verificationStatus = status;
  }
  if (abnormalOnly === 'true') {
    query.interpretation = { $in: ['ABNORMAL', 'HIGH', 'LOW'] };
  }

  const observations = await ObservationModel.find(query)
    .sort({ observationDate: -1 })
    .populate('sourceDocumentId', 'originalName documentType');

  res.json({
    success: true,
    count: observations.length,
    observations,
  });
}

export async function getObservationTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  // Retrieve numeric observations sorted by date
  const obs = await ObservationModel.find({
    userId,
    valueNumeric: { $ne: null, $exists: true },
  })
    .sort({ observationDate: 1 })
    .populate('sourceDocumentId', 'originalName');

  // Group by testName
  const trendsMap: Record<string, any[]> = {};
  obs.forEach((o) => {
    const key = o.testName;
    if (!trendsMap[key]) {
      trendsMap[key] = [];
    }
    trendsMap[key].push({
      id: o._id,
      date: o.observationDate.toISOString().split('T')[0],
      timestamp: o.observationDate.getTime(),
      value: o.valueNumeric,
      valueString: o.valueString,
      unit: o.unit || '',
      refLow: o.referenceRangeLow,
      refHigh: o.referenceRangeHigh,
      referenceRange: o.referenceRangeString,
      interpretation: o.interpretation,
      documentId: (o.sourceDocumentId as any)?._id,
      documentName: (o.sourceDocumentId as any)?.originalName || 'Document',
      pageNumber: o.pageNumber,
    });
  });

  const trends = Object.keys(trendsMap).map((testName) => {
    const dataPoints = trendsMap[testName];
    const latest = dataPoints[dataPoints.length - 1];
    return {
      testName,
      unit: latest.unit,
      count: dataPoints.length,
      latestValue: latest.value,
      latestInterpretation: latest.interpretation,
      referenceRange: latest.referenceRange,
      dataPoints,
    };
  });

  res.json({
    success: true,
    trends,
  });
}
