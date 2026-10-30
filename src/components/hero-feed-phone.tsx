import { Compass, Heart, Home, MessageCircle, PlusSquare, Share2, UserRound } from "lucide-react";

import { TijarLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export function HeroFeedPhone({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[280px]", className)}>
      <div
        className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-[#1F7A4D]/15 blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[2.1rem] border-[3px] border-[#0B1F4D] bg-[#0B1F4D] p-[7px] shadow-[0_28px_60px_-28px_rgba(11,31,77,0.55)]">
        <div className="overflow-hidden rounded-[1.7rem] bg-white">
          <div className="flex items-center justify-between px-3 pt-2.5 text-[10px] font-bold text-[#0B1F4D]">
            <span>9:41</span>
            <span className="h-[14px] w-[28%] rounded-full bg-black" aria-hidden />
            <span>5G</span>
          </div>
          <div className="flex items-center justify-center px-4 pb-1 pt-1">
            <TijarLogo compact className="h-7 w-auto" />
          </div>
          <div className="flex items-center justify-center gap-4 border-b border-[#EEF1F5] pb-2 text-[11px] font-extrabold">
            <span className="text-[#0B1F4D]">
              For You
              <span className="mx-auto mt-0.5 block h-0.5 w-10 rounded-full bg-[#0B1F4D]" />
            </span>
            <span className="text-[#6B7280]">Following</span>
            <span className="text-[#6B7280]">Nearby</span>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            <img
              src="/tijar-market-stall.jpg"
              alt=""
              className="size-full object-cover"
              width={640}
              height={800}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-3 pb-3 pt-16 text-white">
              <p className="text-[11px] font-bold">@MamaKemi · Market stall</p>
              <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug">
                Fresh peppers and tomatoes. Buy now from the stall you already know.
              </p>
            </div>
            <div className="absolute bottom-16 right-2 flex flex-col items-center gap-3 text-white">
              <Heart className="size-6 fill-white" />
              <MessageCircle className="size-6" />
              <Share2 className="size-5" />
            </div>
          </div>
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-extrabold text-[#0B1F4D]">Pepper mix · ₦2,500</p>
              <span className="rounded-full bg-[#1F7A4D] px-3 py-1.5 text-[10px] font-extrabold text-white">
                Buy now
              </span>
            </div>
          </div>
          <div className="flex items-center justify-around border-t border-[#EEF1F5] py-2.5 text-[#0B1F4D]">
            <Home className="size-5" strokeWidth={2.4} />
            <Compass className="size-5 opacity-50" />
            <PlusSquare className="size-5 opacity-50" />
            <MessageCircle className="size-5 opacity-50" />
            <UserRound className="size-5 opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
