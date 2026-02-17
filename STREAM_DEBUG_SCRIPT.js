// Streaming Debug Script
// Copy and paste this into browser console while testing streaming

(function streamDebugger() {
  console.log('%c🔍 Stream Debugger Activated', 'font-size:16px;font-weight:bold;color:#0066cc');
  
  const state = {
    chunkCount: 0,
    totalLength: 0,
    lastChunkTime: Date.now(),
    chunks: [],
  };
  
  // Intercept Stream logs
  const origLog = console.log;
  console.log = function(...args) {
    const msg = args[0]?.toString?.() || '';
    
    if (msg.includes('[Stream] Chunk received')) {
      state.chunkCount++;
      const match = args[2]; // total length is arg[2]
      if (match !== undefined) {
        state.totalLength = match;
        state.chunks.push({
          time: Date.now(),
          length: args[1],
          total: args[2],
          snippet: args[3],
        });
      }
      
      // Show summary every 5 chunks
      if (state.chunkCount % 5 === 0) {
        console.warn(`📊 [Stream] ${state.chunkCount} chunks, ${state.totalLength} chars total`);
      }
    }
    
    if (msg.includes('[ChatMessage] Content state update')) {
      const update = args[1];
      console.warn(`✏️ [State] Updated with ${update.length} chars`, update);
    }
    
    if (msg.includes('[SolutionDisplay] Using') || msg.includes('[SolutionDisplay] No content')) {
      if (msg.includes('No content')) {
        console.error('❌ [Display] CONTENT IS EMPTY!');
        console.table(state);
      } else {
        const match = args[1];
        console.warn(`✅ [Display] Rendering ${match} chars`);
      }
    }
    
    origLog.apply(console, args);
  };
  
  // Provide inspection function
  window.inspectStreamState = () => {
    console.group('%c📋 Stream State', 'font-weight:bold');
    console.log('Chunks received:', state.chunkCount);
    console.log('Total content length:', state.totalLength);
    console.log('First chunk:', state.chunks[0]);
    console.log('Last chunk:', state.chunks[state.chunks.length - 1]);
    console.table(state.chunks);
    console.groupEnd();
  };
  
  console.log('%c✅ Use window.inspectStreamState() to view diagnostics', 'color:green');
  console.log('%c📊 Console will show warnings for chunk/state/display updates', 'color:orange');
})();

// Run inspection after stream completes
// Just type: window.inspectStreamState()
