import { ExternalLink, Loader2, ImageOff } from 'lucide-react';
import { useState } from 'react';
import { getScryfallCardUrl, type ScryfallCard } from '@/lib/scryfall';
import { getPokemonCardUrl, type PokemonCard } from '@/lib/pokemontcg';
import { cn } from '@/lib/utils';
import type { GameType } from '@/lib/types';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

type CardData = ScryfallCard | PokemonCard;

function isScryfallCard(card: CardData): card is ScryfallCard {
  return 'scryfall_uri' in card || ('prices' in card && !('images' in card));
}

function isPokemonCard(card: CardData): card is PokemonCard {
  return 'images' in card && 'set' in card;
}

interface CardListItemProps {
  cardName: string;
  quantity: number;
  game: GameType;
  cardData?: CardData | null;
  priceLoading?: boolean;
}

export function CardListItem({
  cardName,
  quantity,
  game,
  cardData,
  priceLoading,
}: CardListItemProps) {
  const [imageError, setImageError] = useState(false);
  
  const isMagic = game === 'magic';
  const isPokemon = game === 'pokemon';
  const hasPricing = isMagic || isPokemon;
  
  const cardUrl = isMagic 
    ? getScryfallCardUrl(cardName) 
    : isPokemon 
      ? getPokemonCardUrl(cardName, (cardData && isPokemonCard(cardData)) ? cardData : null)
      : null;

  const getPrice = (): string | null => {
    if (!cardData) return null;
    if (isScryfallCard(cardData)) {
      return cardData.prices?.usd ?? null;
    }
    // TCGdex doesn't provide pricing, so return null for Pokemon cards
    return null;
  };

  const getImageUrl = (): string | null => {
    if (!cardData) return null;
    if (isScryfallCard(cardData)) {
      return cardData.image_uris?.normal || cardData.image_uris?.small || null;
    }
    if (isPokemonCard(cardData)) {
      return cardData.images?.large || cardData.images?.small || null;
    }
    return null;
  };

  const getSetInfo = (): { name: string; rarity?: string } | null => {
    if (!cardData) return null;
    if (isScryfallCard(cardData)) {
      return { name: cardData.set_name, rarity: cardData.rarity };
    }
    if (isPokemonCard(cardData)) {
      return { name: cardData.set.name, rarity: cardData.rarity };
    }
    return null;
  };

  const price = getPrice();
  const totalPrice = price ? (parseFloat(price) * quantity).toFixed(2) : null;
  const imageUrl = getImageUrl();
  const setInfo = getSetInfo();

  const CardContentInner = () => (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="font-mono text-sm text-muted-foreground w-8 shrink-0">
          {quantity}×
        </span>
        <span className={cn(
          "truncate",
          hasPricing && "group-hover:text-primary transition-colors"
        )}>
          {cardName}
        </span>
        {hasPricing && cardUrl && (
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </div>
      
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {priceLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : totalPrice ? (
          <span className="text-sm text-muted-foreground font-mono">
            ${totalPrice}
          </span>
        ) : hasPricing && cardData === null ? (
          <span className="text-xs text-muted-foreground/50">—</span>
        ) : null}
      </div>
    </div>
  );

  if (!hasPricing || !cardUrl) {
    return <CardContentInner />;
  }

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={cardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <CardContentInner />
        </a>
      </HoverCardTrigger>
      <HoverCardContent 
        side="left" 
        align="start" 
        className="w-auto p-2 bg-card border-border"
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={cardName}
            className="rounded-lg w-[200px] h-auto"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-[200px] h-[280px] bg-secondary/50 rounded-lg flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {setInfo && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {setInfo.name}{setInfo.rarity && ` • ${setInfo.rarity}`}
            {price && <span className="ml-2 text-foreground">${price}</span>}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
