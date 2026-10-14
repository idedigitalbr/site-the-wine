import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as common from '@zxcvbn-ts/language-common';
import * as english from '@zxcvbn-ts/language-en';
import * as portuguese from '@zxcvbn-ts/language-pt-br';
import { isWeakPassword } from './password-policy';

const estimator = new ZxcvbnFactory({
  translations: portuguese.translations,
  graphs: common.adjacencyGraphs,
  dictionary: {
    ...common.dictionary,
    ...english.dictionary,
    ...portuguese.dictionary,
  },
});

export function assessPassword(password: string, userInputs: string[]) {
  const result = estimator.check(password, userInputs.filter(Boolean));
  return {
    score: result.score,
    weak: isWeakPassword(password, result.score),
    warning: result.feedback.warning,
    suggestions: result.feedback.suggestions,
  };
}
