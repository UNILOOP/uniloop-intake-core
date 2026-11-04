import { useMemo } from 'react';
import { SurveyForm } from '../../renderer/SurveyForm';
import { detectSurveyMode } from '../../utils/surveyUtils';
import type { SurveySnapshot } from '../types';

/** The merged form as patients would see it. */
export const MergePreview = ({ merged }: { merged: SurveySnapshot }) => {
  const mode = useMemo(() => detectSurveyMode(merged.rootNode), [merged.rootNode]);
  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <SurveyForm key={JSON.stringify(merged.rootNode?.uuid ?? '') + mode} survey={{ rootNode: merged.rootNode, localizations: merged.localizations, theme: merged.theme }} mode={mode} />
    </div>
  );
};
