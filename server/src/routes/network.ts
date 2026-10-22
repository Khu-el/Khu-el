import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { appendCheckpoint, verifyOwner } from '../network/checkpoint.js';
import { DeskError } from '../network/logic.js';
import * as store from '../network/store.js';

/**
 * NTE ministry network desk. Every route uses the header bearer token.
 * Handlers are synchronous; a thrown DeskError is the caller's fault, and
 * anything else reaches the shared error middleware.
 */
export const networkRouter = Router();
networkRouter.use(requireAuth);

function send(res: Response, status: number, fn: () => unknown) {
  try {
    res.status(status).json(fn());
  } catch (err) {
    if (err instanceof DeskError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
}

networkRouter.get('/health', (req: AuthedRequest, res) => {
  send(res, 200, () => store.health(req.user!));
});

networkRouter.get('/projects', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ projects: store.listProjects(req.user!) }));
});

networkRouter.post('/projects', (req: AuthedRequest, res) => {
  send(res, 201, () => ({ project: store.createProject(req.user!, req.body ?? {}) }));
});

networkRouter.patch('/projects/:id', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ project: store.updateProject(req.user!, String(req.params.id), req.body ?? {}) }));
});

networkRouter.get('/projects/:id/tasks', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ tasks: store.listTasks(req.user!, String(req.params.id)) }));
});

networkRouter.post('/projects/:id/tasks', (req: AuthedRequest, res) => {
  send(res, 201, () => ({ task: store.createTask(req.user!, String(req.params.id), req.body ?? {}) }));
});

networkRouter.patch('/tasks/:id', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ task: store.updateTask(req.user!, String(req.params.id), req.body ?? {}) }));
});

networkRouter.get('/pipeline', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ items: store.listPipeline(req.user!) }));
});

networkRouter.post('/pipeline', (req: AuthedRequest, res) => {
  send(res, 201, () => ({ item: store.createPipeline(req.user!, req.body ?? {}) }));
});

networkRouter.post('/pipeline/:id/advance', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ item: store.advancePipeline(req.user!, String(req.params.id), req.body ?? {}) }));
});

networkRouter.post('/pipeline/:id/propose-release', (req: AuthedRequest, res) => {
  send(res, 200, () => store.proposeRelease(req.user!, String(req.params.id)));
});

networkRouter.post('/pipeline/:id/approve', (req: AuthedRequest, res) => {
  send(res, 200, () => store.approveRelease(req.user!, String(req.params.id), req.body ?? {}));
});

networkRouter.post('/pipeline/:id/approve-sample', (req: AuthedRequest, res) => {
  send(res, 200, () => store.approveAsSampleActor(req.user!, String(req.params.id), req.body ?? {}));
});

networkRouter.get('/leads', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ leads: store.listLeads(req.user!) }));
});

networkRouter.post('/leads', (req: AuthedRequest, res) => {
  send(res, 201, () => ({ lead: store.createLead(req.user!, req.body ?? {}) }));
});

networkRouter.get('/assets', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ assets: store.listAssets(req.user!) }));
});

networkRouter.post('/assets', (req: AuthedRequest, res) => {
  send(res, 201, () => ({ asset: store.createAsset(req.user!, req.body ?? {}) }));
});

networkRouter.get('/campaigns', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ campaigns: store.listCampaigns(req.user!) }));
});

networkRouter.post('/campaigns', (req: AuthedRequest, res) => {
  send(res, 201, () => ({ campaign: store.createCampaign(req.user!, req.body ?? {}) }));
});

networkRouter.get('/integrations', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ integrations: store.listIntegrations(req.user!) }));
});

networkRouter.post('/integrations/:provider/configure', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ integration: store.configureIntegration(req.user!, String(req.params.provider), req.body ?? {}) }));
});

networkRouter.post('/integrations/:provider/check', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ integration: store.checkIntegration(req.user!, String(req.params.provider)) }));
});

networkRouter.get('/queues', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ queues: store.listQueues(req.user!) }));
});

networkRouter.post('/queues', (req: AuthedRequest, res) => {
  send(res, 201, () => ({ queue: store.createQueue(req.user!, req.body ?? {}) }));
});

networkRouter.post('/queues/:id/act', (_req, res) => {
  send(res, 200, () => store.actOnQueue());
});

networkRouter.get('/events', (req: AuthedRequest, res) => {
  send(res, 200, () => ({ events: store.listEvents(req.user!) }));
});

networkRouter.post('/ledger/checkpoint', (req: AuthedRequest, res) => {
  send(res, 201, () => ({ checkpoint: appendCheckpoint(req.user!.sub) }));
});

networkRouter.get('/ledger/verify', (req: AuthedRequest, res) => {
  send(res, 200, () => verifyOwner(req.user!.sub));
});

networkRouter.post('/samples', (req: AuthedRequest, res) => {
  send(res, 201, () => store.loadSamples(req.user!));
});
