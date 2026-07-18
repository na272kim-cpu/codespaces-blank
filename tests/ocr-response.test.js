import test from 'node:test';
import assert from 'node:assert/strict';
import { extractClientGeminiApiKey, parseGeminiResponse, parseOcrTextToCardData } from '../src/utils/ocrUtils.js';

test('parses fenced JSON returned by Gemini', () => {
  const raw = '```json\n{"name":"홍길동","company":"테스트컴퍼니","role":"대표","email":"hong@test.com","phone":"010-1234-5678","phone2":"","country":"대한민국","address":"서울시 강남구","website":"https://example.com","notes":""}\n```';

  assert.deepEqual(parseGeminiResponse(raw), {
    name: '홍길동',
    company: '테스트컴퍼니',
    role: '대표',
    email: 'hong@test.com',
    phone: '010-1234-5678',
    phone2: '',
    country: '대한민국',
    address: '서울시 강남구',
    website: 'https://example.com',
    notes: ''
  });
});

test('never exposes browser-side Gemini API keys', () => {
  assert.equal(extractClientGeminiApiKey(), '');
});

test('extracts card fields from OCR text reliably', () => {
  const text = ['홍길동', '테크솔루션', '대표', 'hong@test.com', '010-1234-5678', '서울시 강남구', 'www.example.com'].join('\n');
  const result = parseOcrTextToCardData(text);

  assert.equal(result.name, '홍길동');
  assert.equal(result.company, '테크솔루션');
  assert.equal(result.role, '대표');
  assert.equal(result.email, 'hong@test.com');
  assert.equal(result.phone, '010-1234-5678');
  assert.equal(result.country, '대한민국');
});

test('avoids treating noisy labels and notes as name or company', () => {
  const text = [
    '메모: 2024년 11월',
    '수기 메모',
    '인쇄 정보',
    '홍길동',
    '테크솔루션',
    'hong@test.com',
    '010-1234-5678',
    '서울시 강남구',
    'www.example.com'
  ].join('\n');
  const result = parseOcrTextToCardData(text);

  assert.equal(result.name, '홍길동');
  assert.equal(result.company, '테크솔루션');
  assert.equal(result.email, 'hong@test.com');
  assert.equal(result.phone, '010-1234-5678');
  assert.equal(result.country, '대한민국');
});
