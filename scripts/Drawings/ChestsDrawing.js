﻿export class ChestsDrawing extends DrawingUtils {
  constructor(Settings) {
    super(Settings);
  }

  interpolate(chests, lpX, lpY, t) {
    for (const chestOne of chests) {
      const hX = -1 * chestOne.posX + lpX;
      const hY = chestOne.posY - lpY;

      if (chestOne.hX === 0 && chestOne.hY === 0) {
        chestOne.hX = hX;
        chestOne.hY = hY;
      }

      chestOne.hX = this.lerp(chestOne.hX, hX, t);
      chestOne.hY = this.lerp(chestOne.hY, hY, t);
    }
  }

  invalidate(ctx, chests) {
    for (const chestOne of chests) {
      const point = this.transformPoint(chestOne.hX, chestOne.hY);
      const chestNameLower = chestOne.chestName.toLowerCase();
  
      if (this.settings.chestGreen) {
        if (chestNameLower.includes("avalon_small")) {
          this.DrawCustomImage(ctx, point.x, point.y, "avalon_green", "Resources", 35);
        } else if (chestNameLower.includes("avalon_medium")) {
          this.DrawCustomImage(ctx, point.x, point.y, "avalon_blue", "Resources", 35);
        } else if (chestNameLower.includes("standard") || chestNameLower.includes("green")) {
          this.DrawCustomImage(ctx, point.x, point.y, "green", "Resources", 35);
        } else if (chestNameLower.includes("uncommon") || chestNameLower.includes("blue")) {
          this.DrawCustomImage(ctx, point.x, point.y, "blue", "Resources", 35);
        } else if (chestNameLower.includes("rare") || chestNameLower.includes("purple")) {
          this.DrawCustomImage(ctx, point.x, point.y, "rare", "Resources", 35);
        } else if (chestNameLower.includes("legendary") || chestNameLower.includes("yellow")) {
          this.DrawCustomImage(ctx, point.x, point.y, "legendary", "Resources", 35);
        }
      }
    }
  }
}