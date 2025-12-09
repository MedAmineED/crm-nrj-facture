import { Injectable } from '@nestjs/common';

export interface ImportProgress {
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    totalRecords: number;
    processedRecords: number;
    successfulImports: number;
    failedImports: number;
    duplicatePhoneNumbers: number;
    failedDueToMissingNumClient: number;
    failedDueToDuplicateNumClient: number;
    failedDueToInvalidPhone: number;
    failedDueToInvalidEmail: number;
    failedDueToDuplicateEmail: number;
    failedDueToOtherErrors: number;
    otherErrorsDetails: string[];
    errorMessage?: string;
    startedAt: Date;
    completedAt?: Date;
}

@Injectable()
export class ImportProgressService {
    private jobs: Map<string, ImportProgress> = new Map();

    createJob(): string {
        const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.jobs.set(jobId, {
            jobId,
            status: 'pending',
            totalRecords: 0,
            processedRecords: 0,
            successfulImports: 0,
            failedImports: 0,
            duplicatePhoneNumbers: 0,
            failedDueToMissingNumClient: 0,
            failedDueToDuplicateNumClient: 0,
            failedDueToInvalidPhone: 0,
            failedDueToInvalidEmail: 0,
            failedDueToDuplicateEmail: 0,
            failedDueToOtherErrors: 0,
            otherErrorsDetails: [],
            startedAt: new Date(),
        });

        return jobId;
    }

    getJob(jobId: string): ImportProgress | undefined {
        return this.jobs.get(jobId);
    }

    updateJob(jobId: string, updates: Partial<ImportProgress>): void {
        const job = this.jobs.get(jobId);
        if (job) {
            Object.assign(job, updates);
        }
    }

    setJobProcessing(jobId: string, totalRecords: number): void {
        this.updateJob(jobId, {
            status: 'processing',
            totalRecords,
        });
    }

    updateProgress(
        jobId: string,
        processedRecords: number,
        result: Partial<ImportProgress>
    ): void {
        this.updateJob(jobId, {
            processedRecords,
            ...result,
        });
    }

    completeJob(jobId: string, result: Partial<ImportProgress>): void {
        this.updateJob(jobId, {
            status: 'completed',
            completedAt: new Date(),
            ...result,
        });
    }

    failJob(jobId: string, errorMessage: string): void {
        this.updateJob(jobId, {
            status: 'failed',
            completedAt: new Date(),
            errorMessage,
        });
    }

    // Clean up old jobs (older than 1 hour)
    cleanupOldJobs(): void {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        for (const [jobId, job] of this.jobs.entries()) {
            if (job.startedAt.getTime() < oneHourAgo) {
                this.jobs.delete(jobId);
            }
        }
    }
}
