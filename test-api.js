// test-api.js
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

console.log('=== Gemini API 연결 테스트 ===\n');

// 환경변수 확인
console.log('1. 환경변수 확인:');
console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ 설정됨' : '✗ 없음'}`);
console.log(`GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '✓ 설정됨' : '✗ 없음'}`);

if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  console.error('\n❌ API 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

// 클라이언트 초기화
console.log('\n2. 클라이언트 초기화...');
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY 
});
console.log('✓ 클라이언트 생성됨');

// API 테스트
console.log('\n3. API 호출 테스트...');

async function testAPI() {
  try {
    console.log('테스트 요청 전송 중...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello, respond with just "API 연결 성공"',
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      }
    });

    console.log('\n4. 응답 분석:');
    console.log('Response object:', typeof response);
    console.log('Response keys:', Object.keys(response));
    
    // text가 함수인지 속성인지 확인
    console.log('response.text type:', typeof response.text);
    
    let textContent;
    if (typeof response.text === 'function') {
      textContent = response.text();
      console.log('✓ response.text()로 텍스트 추출');
    } else {
      textContent = response.text;
      console.log('✓ response.text로 텍스트 추출');
    }
    
    console.log('\n5. 최종 결과:');
    console.log('응답 내용:', textContent);
    
    if (textContent && textContent.includes('API 연결 성공')) {
      console.log('\n🎉 API 연결 성공! 모든 테스트 통과');
    } else {
      console.log('\n⚠️  API 연결됨, 하지만 예상과 다른 응답:', textContent);
    }
    
  } catch (error) {
    console.log('\n❌ API 호출 실패:');
    console.error('에러 타입:', error.constructor.name);
    console.error('에러 메시지:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('\n💡 API 키 관련 문제입니다. .env 파일의 키가 유효한지 확인하세요.');
    } else if (error.message.includes('quota')) {
      console.error('\n💡 할당량 초과입니다. API 사용량을 확인하세요.');
    } else if (error.message.includes('permission')) {
      console.error('\n💡 권한 문제입니다. API 키 권한을 확인하세요.');
    }
    
    console.error('\n전체 에러:', error);
  }
}

testAPI();