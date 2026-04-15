import { searchCharacter, fetchAndParseCharacter } from './lodestone.js';
import { normalizeCharacter } from './normalize.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

async function handleCharacterRequest(url) {
  const name = url.searchParams.get('name');
  const server = url.searchParams.get('server');

  if (!name || !server) {
    return jsonResponse({ ok: false, error: 'missing_params' }, 400);
  }

  try {
    const characterId = await searchCharacter(name, server);
    const raw = await fetchAndParseCharacter(characterId);
    const normalized = normalizeCharacter(raw);

    return jsonResponse({
      ok: true,
      character: normalized,
      totals: { minions: 490, mounts: 340 },
    });
  } catch (err) {
    if (err.message === 'not_found') {
      return jsonResponse({ ok: false, error: 'not_found' }, 404);
    }
    return jsonResponse({ ok: false, error: 'lodestone_unavailable' }, 502);
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === 'GET' && url.pathname === '/api/character') {
      return handleCharacterRequest(url);
    }

    return jsonResponse({ ok: false, error: 'not_found' }, 404);
  },
};
