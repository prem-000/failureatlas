import type {
  Platform,
  EditorEvidence,
  NetworkEvidence,
  ResultEvidence,
  SubmitEvidence,
  ProblemEvidence,
  AdapterContext,
} from './types';
import type { SubmissionStatus } from '../../types';

export abstract class PlatformAdapter {
  abstract readonly platform: Platform;

  abstract matches(url: string): boolean;

  abstract initialize(context: AdapterContext): Promise<void>;

  abstract cleanup(): Promise<void>;

  abstract captureEditor(): EditorEvidence | null;

  abstract captureProblem(): ProblemEvidence;

  abstract startNetworkCapture(onEvidence: (e: NetworkEvidence) => void): void;

  abstract startResultMonitor(onResult: (r: ResultEvidence) => void): void;

  abstract detectSubmitAction(onSubmit: (s: SubmitEvidence) => void): void;

  abstract normalizeLanguage(rawLang: string): string;

  abstract normalizeStatus(rawStatus: string): SubmissionStatus;
}
