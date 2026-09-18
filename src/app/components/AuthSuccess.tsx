import { useNavigate } from 'react-router';
import { CheckCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
        >
          <CheckCircle className="w-12 h-12 text-green-600" />
        </motion.div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to My Little Debugger!</h2>

        <div className="bg-purple-50 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-purple-900 font-medium">
                Your account has been created successfully.
              </p>
              <p className="text-purple-700 text-sm mt-2">
                - Debug Buddy
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all"
        >
          Continue to Login
        </button>
      </motion.div>
    </div>
  );
}
