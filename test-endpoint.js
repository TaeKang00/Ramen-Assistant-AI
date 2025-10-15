// test-endpoint.js
import fetch from 'node-fetch'; // npm install node-fetch 필요할 수 있음

const SERVER_URL = 'http://localhost:8787';

console.log('=== 서버 엔드포인트 테스트 ===\n');

async function testServer() {
  // 1. 서버 응답 확인
  console.log('1. 서버 상태 확인...');
  try {
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    if (healthResponse.ok) {
      try {
        const healthData = await healthResponse.json();
        console.log('✓ 서버 응답 (JSON):', healthData);
      } catch (jsonError) {
        console.log('✓ 서버 응답 (HTML) - 서버는 실행 중이지만 /health 엔드포인트 없음');
      }
    } else {
      console.log('❌ 서버 응답 에러:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ 서버에 연결할 수 없습니다:', error.message);
    console.log('서버가 실행 중인지 확인하세요: npm start');
    return;
  }

  // 2. 메인 페이지 확인
  console.log('\n2. 메인 페이지 확인...');
  try {
    const pageResponse = await fetch(SERVER_URL);
    if (pageResponse.ok) {
      console.log('✓ 메인 페이지 로드 성공');
    } else {
      console.log('❌ 메인 페이지 로드 실패:', pageResponse.status);
    }
  } catch (error) {
    console.log('❌ 메인 페이지 에러:', error.message);
  }

  // 3. API 엔드포인트 테스트
  console.log('\n3. /api/parse 엔드포인트 테스트...');
  
  const testCases = [
    '신라면 4분',
    '컵라면 3분인데 2분 50초만',
    '너구리',
    '불닭볶음면 5:30',
    '라면 2분'
  ];

  for (const testCase of testCases) {
    console.log(`\n테스트 케이스: "${testCase}"`);
    try {
      const response = await fetch(`${SERVER_URL}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testCase })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✓ 성공:', {
          name: data.name,
          seconds: data.seconds,
          minutes: Math.floor(data.seconds / 60) + ':' + (data.seconds % 60).toString().padStart(2, '0')
        });
      } else {
        console.log('❌ 실패:', data);
      }
    } catch (error) {
      console.log('❌ 요청 에러:', error.message);
    }
  }
}

// 실행 전 서버가 실행 중인지 확인
console.log('서버가 http://localhost:8787 에서 실행 중인지 확인하세요.');
console.log('서버 실행: npm start\n');

testServer();