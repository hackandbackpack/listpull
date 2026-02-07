import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { CONFIG } from '@/lib/config';
import logo from '@/assets/logo.png';

export default function Index() {
  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-slide-up">
            {/* Logo */}
            <div className="inline-flex items-center justify-center mb-8">
              <img
                src={logo}
                alt={`${CONFIG.store.name} - Elevate Your Game`}
                className="h-32 md:h-40 lg:h-48 w-auto"
              />
            </div>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Submit your decklist and we'll pull the singles for you. 
              Pick up when ready — no hunting through bins.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/submit">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  <FileText className="mr-2 h-5 w-5" />
                  Submit a Decklist
                </Button>
              </Link>
              <Link to="/status">
                <Button variant="glow" size="xl" className="w-full sm:w-auto">
                  <Clock className="mr-2 h-5 w-5" />
                  Check Order Status
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It <span className="text-gradient">Works</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: FileText,
                title: 'Submit Your List',
                description: 'Paste your decklist or upload a file. We support MTG, One Piece, Pokémon, and more.',
              },
              {
                icon: Clock,
                title: 'We Pull the Cards',
                description: "Our staff searches our inventory and pulls your singles. We'll notify you when it's ready.",
              },
              {
                icon: CheckCircle2,
                title: 'Pick Up & Play',
                description: 'Come to the store, grab your cards, and hit the tables. No waiting around.',
              },
            ].map((step, i) => (
              <div key={i} className="glow-card p-8 text-center group hover:-translate-y-2 transition-transform duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 group-hover:bg-primary/20 transition-colors">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Games */}
      <section className="py-20 relative bg-card/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Supported <span className="text-gradient">Games</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { name: 'Magic: The Gathering', color: 'bg-purple-500/20 border-purple-500/30' },
              { name: 'One Piece TCG', color: 'bg-red-500/20 border-red-500/30' },
              { name: 'Pokémon', color: 'bg-yellow-500/20 border-yellow-500/30' },
              { name: 'Disney Lorcana', color: 'bg-blue-500/20 border-blue-500/30' },
              { name: 'Gundam', color: 'bg-orange-500/20 border-orange-500/30' },
              { name: 'Riftbound', color: 'bg-emerald-500/20 border-emerald-500/30' },
              { name: 'Other Games', color: 'bg-gray-500/20 border-gray-500/30' },
            ].map((game, i) => (
              <div
                key={i}
                className={`rounded-xl border p-6 text-center hover:scale-105 transition-transform ${game.color}`}
              >
                <span className="font-medium">{game.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="glow-card p-12 max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to build your deck?
            </h2>
            <p className="text-muted-foreground mb-8">
              Submit your list now and we'll have your cards ready for pickup.
            </p>
            <Link to="/submit">
              <Button variant="hero" size="lg">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
