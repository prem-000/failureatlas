'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">FailureAtlas</div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="secondary">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Register</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">FailureAtlas</h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI-powered failure intelligence for competitive programming
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform your coding failures into learning opportunities. FailureAtlas analyzes your submissions,
            identifies root causes, maps systemic weaknesses, and recommends personalized learning strategies.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Intelligent Analysis</h3>
            <p className="text-muted-foreground">
              Myers diff, structural code pattern analysis, and behavioral pattern recognition identify why your solutions fail.
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Knowledge Graph</h3>
            <p className="text-muted-foreground">
              Graph-powered failure relationships map systemic weaknesses across problem domains.
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Personalized Guidance</h3>
            <p className="text-muted-foreground">
              LLM-generated diagnoses with targeted learning strategies to improve faster.
            </p>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to improve?</h2>
          <div className="space-x-4">
            <Link href="/register">
              <Button className="px-8 py-3">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="px-8 py-3">Sign In</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
