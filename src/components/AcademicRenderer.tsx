import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

import type { AcademicResponse } from '../types/AcademicResponse';
import { validateAcademicResponse } from '../utils/validateAcademicResponse';

interface AcademicRendererProps {
  response: AcademicResponse;
}

export const AcademicRenderer: React.FC<AcademicRendererProps> = ({ response }) => {
  const validation = validateAcademicResponse(response);

  if (!validation.valid) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg animate-in fade-in duration-500">
        <h3 className="text-lg font-bold text-red-800 mb-2">Erreur de format</h3>
        <p className="text-red-700">{validation.error}</p>
      </div>
    );
  }

  return (
    <article className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md animate-in fade-in duration-500 space-y-6">
      {/* Partie Header */}
      <div className="border-b-2 border-blue-500 pb-4">
        <h2 className="text-2xl font-bold text-blue-800">
          {response.partie}
        </h2>
      </div>

      {/* Problem Statement */}
      <section className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
        <p className="text-gray-800 leading-relaxed">
          {response.problemStatement}
        </p>
      </section>

      {/* Steps */}
      <div className="space-y-6">
        {response.steps.map((step, index) => (
          <section
            key={index}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Step Header */}
            <div className="flex items-start gap-4 mb-3">
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-lg">
                {index + 1}
              </div>
              <h3 className="text-lg font-bold text-gray-900 pt-1">
                {step.title}
              </h3>
            </div>

            {/* Step Explanation */}
            <p className="text-gray-700 ml-14 leading-relaxed mb-4">
              {step.explanation}
            </p>

            {/* Step Equations */}
            {step.equations && step.equations.length > 0 && (
              <div className="ml-14 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {step.equations.map((equation, eqIndex) => (
                  <div key={eqIndex} className="flex justify-center">
                    <BlockMath>{equation}</BlockMath>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Conclusion */}
      {response.conclusion && (
        <section className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${response.steps.length * 100}ms` }}
        >
          <h3 className="text-lg font-bold text-green-800 mb-4">Conclusion</h3>
          <div className="flex justify-center">
            <BlockMath>{response.conclusion}</BlockMath>
          </div>
        </section>
      )}
    </article>
  );
};

export default AcademicRenderer;
