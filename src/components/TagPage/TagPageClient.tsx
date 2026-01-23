'use client';

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Flame, Beef, Wheat, Droplet, X } from "lucide-react";
import type { TagScanItem } from "@/utils/tagScans.server";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { FoodResultsClient } from "@/components/FoodResults/FoodResultsClient";

type TagPageClientProps = {
  tagName: string;
  scans: TagScanItem[];
};

const ITEMS_PER_PAGE = 15;

export function TagPageClient({ tagName, scans }: TagPageClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  // Calculate pagination
  const totalPages = Math.ceil(scans.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentScans = useMemo(
    () => scans.slice(startIndex, endIndex),
    [scans, startIndex, endIndex]
  );

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // Show max 5 page numbers at once

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 capitalize">{tagName}</h1>
        <p className="text-muted-foreground">
          {scans.length} {scans.length === 1 ? 'dish' : 'dishes'} found
        </p>
      </div>

      {scans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No dishes found with this tag yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentScans.map((scan) => (
              <Card
                key={scan.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedScanId(scan.id)}
              >
                {/* Food Image */}
                {scan.imageUrl && (
                  <div className="relative w-full aspect-video overflow-hidden rounded-t-lg bg-muted">
                    <img
                      src={scan.imageUrl}
                      alt={scan.dish}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Hide image on error
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg font-semibold line-clamp-2">{scan.dish}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Calories */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-muted-foreground">Calories</span>
                      </div>
                      <span className="font-semibold">{Math.round(scan.nutrients.calories || 0)}</span>
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Beef className="h-3 w-3 text-red-500" />
                          <span className="text-xs text-muted-foreground">Protein</span>
                        </div>
                        <div className="font-semibold text-sm">
                          {Math.round(scan.nutrients.protein_g || 0)}g
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Wheat className="h-3 w-3 text-amber-500" />
                          <span className="text-xs text-muted-foreground">Carbs</span>
                        </div>
                        <div className="font-semibold text-sm">
                          {Math.round(scan.nutrients.carbohydrates_g || 0)}g
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Droplet className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-muted-foreground">Fat</span>
                        </div>
                        <div className="font-semibold text-sm">
                          {Math.round(scan.nutrients.fat_g || 0)}g
                        </div>
                      </div>
                    </div>

                    {/* Additional nutrients */}
                    {(scan.nutrients.fiber_g || scan.nutrients.sugar_g) && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        {scan.nutrients.fiber_g && (
                          <span>Fiber: {Math.round(scan.nutrients.fiber_g)}g</span>
                        )}
                        {scan.nutrients.sugar_g && (
                          <span>Sugar: {Math.round(scan.nutrients.sugar_g)}g</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {pageNumbers.map((page, index) => (
                  <PaginationItem key={index}>
                    {page === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page as number);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) {
                        setCurrentPage(currentPage + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
      <Dialog open={!!selectedScanId} onOpenChange={(open) => !open && setSelectedScanId(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] overflow-y-auto p-0 sm:max-w-[90vw] lg:max-w-7xl">
          {selectedScanId && (
            <div className="relative w-full h-full">
              <FoodResultsClient
                initialScanId={selectedScanId}
                isModal={true}
                onClose={() => setSelectedScanId(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
