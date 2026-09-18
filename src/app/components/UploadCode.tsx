import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload, FileCode, CheckCircle, Sparkles } from 'lucide-react';
import { store } from '../store';
import { createProjectRequest, listProjectsRequest, uploadFileRequest } from '../api';

const supportedLanguages: Record<string, string> = {
  py: 'Python',
  java: 'Java',
  cs: 'C#',
};

export default function UploadCode() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const selectFile = (file: File | undefined) => {
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!supportedLanguages[extension]) {
      setSelectedFile(null);
      setError('Please choose a Python (.py), Java (.java), or C# (.cs) file.');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');

    try {
      const code = await selectedFile.text();
      const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const language = supportedLanguages[extension];
      const projects = await listProjectsRequest();
      const project = projects[0] || await createProjectRequest('My Debugging Project');
      const uploadedFile = await uploadFileRequest(
        project.id,
        selectedFile.name,
        language,
        code,
      );

      const analyzedFile = {
        id: uploadedFile.id.toString(),
        fileName: selectedFile.name,
        language,
        uploadDate: new Date().toLocaleDateString(),
        errorCount: 0,
        status: 'Uploaded',
        code,
        errors: []
      };

      store.addAnalyzedFile(analyzedFile);
      navigate('/dashboard/analyze');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to upload this file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Your Code</h2>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step-by-step instructions */}
        <div className="mb-8">
          <h3 className="font-medium text-gray-700 mb-4">How to upload your code:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <div className="font-medium text-gray-900">Click Choose File</div>
                <div className="text-sm text-gray-600">Select the button below to browse your files</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <div className="font-medium text-gray-900">Select Your File</div>
                <div className="text-sm text-gray-600">Choose .py, .java, or .cs file</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <div className="font-medium text-gray-900">Click Analyze Code</div>
                <div className="text-sm text-gray-600">Let Debug Buddy check your code</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                4
              </div>
              <div>
                <div className="font-medium text-gray-900">Review Results</div>
                <div className="text-sm text-gray-600">See highlighted errors and fixes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center mb-6 transition-colors ${
            isDragging ? 'border-purple-600 bg-purple-100' : 'border-purple-300 bg-purple-50/50'
          }`}
        >
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="font-medium text-gray-900 mb-2">Drag and drop your file here</h3>
          <p className="text-sm text-gray-600 mb-4">or click the button below</p>
          <p className="text-xs text-gray-500 mb-6">
            Supported formats: .py (Python), .java (Java), .cs (C#)
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.java,.cs"
            onChange={handleFileInputChange}
            className="sr-only"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
          >
            <FileCode className="w-5 h-5" />
            Choose File
          </button>
        </div>

        {/* Selected File Display */}
        {selectedFile && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">File selected: {selectedFile.name}</div>
              <div className="text-sm text-gray-600">
                {supportedLanguages[selectedFile.name.split('.').pop()?.toLowerCase() || '']}
              </div>
            </div>
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || isUploading}
          className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            selectedFile
              ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          {isUploading ? 'Uploading Code...' : 'Analyze Code'}
        </button>
      </div>

    </div>
  );
}
