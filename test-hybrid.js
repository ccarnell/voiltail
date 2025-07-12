// Simple test script to verify the hybrid architecture
// Run with: node test-hybrid.js

const BASE_URL = 'http://localhost:3000';

async function testHybridArchitecture() {
  console.log('🧪 Testing Hybrid Architecture...\n');
  
  try {
    // Test 1: Basic Mode (should work as before)
    console.log('1️⃣ Testing Basic Mode...');
    const basicResponse = await fetch(`${BASE_URL}/api/ai/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'What is artificial intelligence?',
        mode: 'basic'
      })
    });
    
    if (basicResponse.ok) {
      const basicData = await basicResponse.json();
      console.log('✅ Basic Mode: Success');
      console.log(`   - Processing time: ${basicData.metadata.totalTime}ms`);
      console.log(`   - Estimated cost: $${basicData.metadata.estimatedCost}`);
    } else {
      console.log('❌ Basic Mode: Failed');
    }
    
    console.log('\n2️⃣ Testing Pro Mode Streaming...');
    
    // Test 2: Pro Mode Streaming (hybrid approach)
    const streamResponse = await fetch(`${BASE_URL}/api/ai/synthesize-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'What is artificial intelligence?',
        mode: 'pro'
      })
    });
    
    if (!streamResponse.ok) {
      console.log('❌ Pro Mode Streaming: Failed to start');
      return;
    }
    
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let resultId = null;
    
    console.log('📡 Streaming events:');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log(`   - ${data.type}: ${data.message || data.progress + '%'}`);
            
            if (data.type === 'synthesis_complete') {
              resultId = data.resultId;
              console.log(`   - Result ID: ${resultId}`);
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }
    
    if (resultId) {
      console.log('\n3️⃣ Testing Result Retrieval...');
      
      // Test 3: Retrieve the stored result
      const resultResponse = await fetch(`${BASE_URL}/api/ai/synthesis-result/${resultId}`);
      
      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        console.log('✅ Result Retrieval: Success');
        console.log(`   - Analysis length: ${resultData.analysis.unifiedResponse.length} chars`);
        console.log(`   - Alignment: ${resultData.analysis.alignment.overallAlignment}`);
        
        // Test 4: Verify result is cleaned up (should fail)
        console.log('\n4️⃣ Testing Result Cleanup...');
        const cleanupResponse = await fetch(`${BASE_URL}/api/ai/synthesis-result/${resultId}`);
        
        if (cleanupResponse.status === 404) {
          console.log('✅ Result Cleanup: Success (result properly deleted)');
        } else {
          console.log('❌ Result Cleanup: Failed (result still exists)');
        }
        
      } else {
        console.log('❌ Result Retrieval: Failed');
      }
    } else {
      console.log('❌ No result ID received from streaming');
    }
    
    console.log('\n🎉 Hybrid Architecture Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testHybridArchitecture();
