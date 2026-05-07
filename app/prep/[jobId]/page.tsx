import PrepPage from '@/components/prep/PrepPage';

export default function InterviewPrepPage({ params }: { params: Promise<{ jobId: string }> }) {
  return <PrepPage paramsPromise={params} />;
}
