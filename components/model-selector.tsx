'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';
import Image from 'next/image';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { models } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';

export function ModelSelector({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedChatModel = useMemo(
    () => models.find((model) => model.id === optimisticModelId),
    [optimisticModelId],
  );

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    
    const query = searchQuery.toLowerCase();
    return models.filter(
      (model) => 
        model.name.toLowerCase().includes(query) || 
        (model.description && model.description.toLowerCase().includes(query)) ||
        model.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Handle input events
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    e.stopPropagation();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          data-testid="model-selector"
          variant="outline"
          className="md:px-2 md:h-[34px]"
        >
          {selectedChatModel?.name}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px] max-h-[400px] overflow-auto">
        <div className="p-2 sticky top-0 bg-popover z-10 border-b">
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari model..."
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              className="pl-8 h-8 text-sm"
              data-testid="model-search-input"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
              >
                ✕
              </Button>
            )}
          </div>
        </div>
        
        {filteredModels.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Model tidak ditemukan
          </div>
        ) : (
          filteredModels.map((model) => {
            const { id } = model;

            return (
              <DropdownMenuItem
                data-testid={`model-selector-item-${id}`}
                key={id}
                onSelect={() => {
                  setOpen(false);

                  startTransition(() => {
                    setOptimisticModelId(id);
                    saveChatModelAsCookie(id);
                  });
                }}
                data-active={id === optimisticModelId}
                asChild
              >
                <button
                  type="button"
                  className="gap-4 group/item flex flex-row justify-between items-center w-full"
                >
                  <div className="flex flex-row gap-3 items-center">
                    {model.image && (
                      <div className="w-8 h-8 relative flex-shrink-0">
                        <Image
                          src={model.image}
                          alt={model.name}
                          width={32}
                          height={32}
                          className="rounded-md object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 items-start">
                      <div>{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.description}
                      </div>
                    </div>
                  </div>

                  <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                    <CheckCircleFillIcon />
                  </div>
                </button>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
