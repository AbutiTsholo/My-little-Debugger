import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Loader2, Sparkles } from 'lucide-react';
import { getAnalysisJobRequest, getAnalysisResultRequest, runAnalysisRequest } from '../api';
import { store } from '../store';

export default function AnalyzeCode() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function analyze() {
      const currentFile = store.getCurrentFile();
      if (!currentFile) {
        navigate('/dashboard/upload', { replace: true });
        return;
      }

      try {
        const job = await runAnalysisRequest(currentFile.id);
        let currentJob = job;
        for (let attempt = 0; attempt < 20 && currentJob.status !== 'completed' && currentJob.status !== 'failed'; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
          currentJob = await getAnalysisJobRequest(job.id);
        }
        if (currentJob.status === 'failed') {
          throw new Error(currentJob.result_summary || 'Analysis failed.');
        }
        const result = await getAnalysisResultRequest(currentFile.id);
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
  }, [navigate]);

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

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

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
