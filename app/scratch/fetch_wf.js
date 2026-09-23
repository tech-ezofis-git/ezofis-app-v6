import fs from 'fs';
import https from 'https';

const sessionData = JSON.parse(fs.readFileSync('./scratch/session.json', 'utf8'));
const token = sessionData.session.accessToken;

fetch('http://localhost:5000/api/v6/workflows', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  const wf = data.data.items.find(w => w.name === 'Document Approval');
  if (wf) {
    console.log("Found workflow:", wf.id);
    return fetch(`http://localhost:5000/api/v6/workflows/${wf.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => res.json()).then(detail => {
      console.log("Workflow detail keys:", Object.keys(detail.data || detail));
      if (detail.data) {
         if (detail.data.workflowJson) {
             console.log("workflowJson type:", typeof detail.data.workflowJson);
             if (typeof detail.data.workflowJson === 'string') {
                 console.log("workflowJson string length:", detail.data.workflowJson.length);
             } else {
                 console.log("workflowJson keys:", Object.keys(detail.data.workflowJson));
             }
         }
         console.log("Steps exists?", !!detail.data.steps);
      }
    });
  } else {
    console.log("Workflow not found");
  }
})
.catch(console.error);
