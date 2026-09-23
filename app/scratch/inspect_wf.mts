import { workflowsApiV6 } from '../src/api/v6/workflows';

async function main() {
  const list = await workflowsApiV6.getWorkflows();
  const wf = list.data?.items?.find(w => w.name === 'Document Approval');
  if (!wf) {
    console.log("Not found");
    return;
  }
  const detail = await workflowsApiV6.getWorkflowById(wf.id);
  console.log(JSON.stringify(detail.data?.workflowJson?.nodes || detail.data?.flowJson?.nodes || [], null, 2));
}
main().catch(console.error);
