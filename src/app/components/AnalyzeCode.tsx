import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Loader2, Sparkles } from 'lucide-react';
import { getAnalysisJobRequest, getAnalysisResultRequest, runAnalysisRequest } from '../api';
import { store } from '../store';

const ANALYSIS_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<T>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('Analysis timed out after 30 seconds.')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

export default function AnalyzeCode() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function analyze() {
      setError('');
      const currentFile = store.getCurrentFile();
      if (!currentFile) {
        navigate('/dashboard/upload', { replace: true });
        return;
      }

      try {
        const deadline = Date.now() + ANALYSIS_TIMEOUT_MS;
        const job = await withTimeout(runAnalysisRequest(currentFile.id), ANALYSIS_TIMEOUT_MS);
        let currentJob = job;
        while (currentJob.status !== 'completed' && currentJob.status !== 'failed') {
          const remaining = deadline - Date.now();
          if (remaining <= 0) throw new Error('Analysis timed out after 30 seconds.');
          await new Promise((resolve) => window.setTimeout(resolve, Math.min(500, remaining)));
          if (cancelled) return;
          currentJob = await withTimeout(getAnalysisJobRequest(job.id), deadline - Date.now());
        }
        if (cancelled) return;
        if (currentJob.status === 'failed') {
          throw new Error(currentJob.result_summary || 'Analysis failed.');
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error('Analysis timed out after 30 seconds.');
        const result = await withTimeout(getAnalysisResultRequest(currentFile.id), remaining);
        if (result.status !== 'completed') {
          throw new Error(result.status === 'failed' ? 'Analysis failed.' : 'Analysis did not complete. Please retry.');
        }
        if (!cancelled) {
          store.updateCurrentFile({
            errorCount: result.error_count,
            status: result.error_count === 0 ? 'Clean' : 'Errors Found',
            errors: result.errors,
          });
          navigate('/dashboard/error-analysis');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Analysis failed.');
      }
    }

    analyze();

    return () => {
      cancelled = true;
    };
  }, [navigate, retryCount]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Analysis didn’t finish</h2>
          <p role="alert" className="text-red-600 mb-6">{error}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setRetryCount((count) => count + 1)}
              className="px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/dashboard/upload')}
              className="px-5 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
            >
              Back to Upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 mx-auto mb-6"
        >
          <Loader2 className="w-20 h-20 text-purple-600" />
        </motion.div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Analyzing Your Code</h2>

        <div className="bg-purple-50 rounded-2xl p-6 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div className="text-left">
              <p className="text-purple-900 font-medium">
                Analyzing your code...
              </p>
              <p className="text-purple-700 text-sm mt-1">
                This will only take a moment!
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
            className="w-2 h-2 bg-purple-600 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-2 bg-purple-600 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-2 bg-purple-600 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
