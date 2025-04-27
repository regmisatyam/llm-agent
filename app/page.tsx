import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <h1 className="text-4xl font-bold mb-6 text-indigo-600">AI-Powered Google Suite Assistant</h1>
      <p className="text-xl mb-12 text-center max-w-3xl">
        Harness the power of AI to manage your Gmail, Calendar, and more, using the Gemini API.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        <FeatureCard 
          title="Email Management" 
          description="Fetch, summarize, and draft replies to your Gmail messages with AI assistance."
          icon="📧"
          path="/email"
        />
        <FeatureCard 
          title="Calendar Scheduling" 
          description="Schedule Google Calendar events from text or voice input using natural language."
          icon="📅"
          path="/calendar"
        />
        <FeatureCard 
          title="Voice Typing" 
          description="Convert your speech to text for emails, calendar events, and more."
          icon="🎤"
          path="/voice"
        />
        <FeatureCard 
          title="Content Summarization" 
          description="Generate concise summaries of emails, documents, and meetings."
          icon="📝"
          path="/summary"
        />
      </div>
      
      <div className="mt-12">
        <Link 
          href="/email" 
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon, path }: { 
  title: string; 
  description: string; 
  icon: string;
  path: string;
}) {
  return (
    <Link href={path} className="block">
      <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 h-full">
        <div className="text-4xl mb-4">{icon}</div>
        <h2 className="text-xl font-semibold mb-2 text-indigo-600">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
    </Link>
  );
}
