import { SENSORS } from './sensors.js';
import { ACTIONS } from './actions.js';

/**
 * Custom Tree Walker Interpreter untuk Pohon Keputusan RoboArena
 * BUKAN menggunakan runtime bawaan LiteGraph.
 * Traversal: Root -> Condition (YA/TIDAK) -> Action
 */
export function evaluateBrain(brainJSON, robotState, gameState) {
  if (!brainJSON || !brainJSON.nodes || brainJSON.nodes.length === 0) {
    ACTIONS.GerakKeMusuh(robotState, gameState);
    return 'GerakKeMusuh';
  }

  // Bangun map untuk penelusuran cepat
  const nodeMap = new Map();
  brainJSON.nodes.forEach(node => nodeMap.set(node.id, node));

  const linkMap = new Map();
  if (Array.isArray(brainJSON.links)) {
    brainJSON.links.forEach(link => {
      // Format link LiteGraph: [id, origin_id, origin_slot, target_id, target_slot, type]
      if (Array.isArray(link)) {
        linkMap.set(link[0], {
          id: link[0],
          originId: link[1],
          originSlot: link[2],
          targetId: link[3],
          targetSlot: link[4]
        });
      }
    });
  }

  // 1. Temukan node Root
  const rootNode = brainJSON.nodes.find(
    n => n.type === 'RoboArena/Root' || n.type === 'Root'
  );

  if (!rootNode) {
    robotState._lastTrace = { nodeIds: [], linkIds: [], timestamp: performance.now() };
    ACTIONS.GerakKeMusuh(robotState, gameState);
    return 'GerakKeMusuh';
  }

  const traceNodes = [rootNode.id];
  const traceLinks = [];

  const finishTrace = () => {
    robotState._lastTrace = { nodeIds: traceNodes, linkIds: traceLinks, timestamp: performance.now() };
  };

  // Ambil link keluar pertama dari Root
  const firstLinkIds = rootNode.outputs?.[0]?.links;
  if (!firstLinkIds || firstLinkIds.length === 0) {
    finishTrace();
    ACTIONS.Diam(robotState, gameState);
    return 'Diam';
  }

  const firstLink = linkMap.get(firstLinkIds[0]);
  if (!firstLink) {
    finishTrace();
    ACTIONS.Diam(robotState, gameState);
    return 'Diam';
  }

  traceLinks.push(firstLink.id);
  let currentNode = nodeMap.get(firstLink.targetId);
  let stepCount = 0;
  const MAX_STEPS = 40; // Mencegah siklus / loop tak terhingga

  while (currentNode && stepCount < MAX_STEPS) {
    stepCount++;
    traceNodes.push(currentNode.id);
    const nodeType = currentNode.type || '';
    const cleanType = nodeType.replace(/^RoboArena\//, '');

    // Cek apakah node bertipe Condition
    if (SENSORS[cleanType]) {
      // Kumpulkan parameter dari widget atau properties
      const params = { ...(currentNode.properties || {}) };
      if (Array.isArray(currentNode.widgets_values)) {
        if (cleanType === 'JarakMusuhKurangDari') {
          params.jarak = currentNode.widgets_values[0];
        } else if (cleanType === 'HPKurangDari') {
          params.persen = currentNode.widgets_values[0];
        } else if (cleanType === 'SekutuDekat') {
          params.jarak = currentNode.widgets_values[0];
        } else if (cleanType === 'HPMusuhRendah') {
          params.ambang = currentNode.widgets_values[0];
        } else if (cleanType === 'WaktuHampirHabis') {
          params.detik = currentNode.widgets_values[0];
        }
      }

      // Evaluasi sensor
      const conditionMet = SENSORS[cleanType](robotState, gameState, params);
      const slotIndex = conditionMet ? 0 : 1; // 0 = YA, 1 = TIDAK

      const outLinkIds = currentNode.outputs?.[slotIndex]?.links;
      if (!outLinkIds || outLinkIds.length === 0) {
        // Cabang buntu: tetap aktif mendekati musuh
        finishTrace();
        ACTIONS.GerakKeMusuh(robotState, gameState);
        return 'GerakKeMusuh (Buntu)';
      }

      const nextLink = linkMap.get(outLinkIds[0]);
      if (!nextLink) {
        finishTrace();
        ACTIONS.GerakKeMusuh(robotState, gameState);
        return 'GerakKeMusuh (Link Rusak)';
      }

      traceLinks.push(nextLink.id);
      currentNode = nodeMap.get(nextLink.targetId);
      continue;
    }

    // Cek apakah node bertipe Action
    if (ACTIONS[cleanType]) {
      const params = { ...(currentNode.properties || {}) };
      if (Array.isArray(currentNode.widgets_values)) {
        if (cleanType === 'GerakKeTitik') {
          params.x = currentNode.widgets_values[0];
          params.y = currentNode.widgets_values[1];
        }
      }

      ACTIONS[cleanType](robotState, gameState, params);
      robotState.lastExecutedAction = cleanType;
      robotState.lastExecutedNodeId = currentNode.id;
      finishTrace();
      return cleanType;
    }

    // Node tidak dikenal, hentikan
    break;
  }

  // Default fallback jika tidak sampai ke action: aktif bergerak mencari musuh
  finishTrace();
  ACTIONS.GerakKeMusuh(robotState, gameState);
  return 'GerakKeMusuh (Fallback)';
}
