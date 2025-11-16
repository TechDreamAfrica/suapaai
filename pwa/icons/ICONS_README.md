# App Icons Guide

This folder should contain the app icons for the PWA in various sizes.

## Required Icon Sizes

You need to create icons in the following sizes:

- **icon-72x72.png** - Used for smaller displays
- **icon-96x96.png** - Common mobile icon size
- **icon-128x128.png** - Standard mobile icon
- **icon-144x144.png** - High-DPI mobile displays
- **icon-152x152.png** - iOS Safari default
- **icon-192x192.png** - Android standard (also used for maskable)
- **icon-384x384.png** - High-resolution displays
- **icon-512x512.png** - Splash screens and high-DPI (also used for maskable)

## Additional Icons (Optional)

- **badge-72x72.png** - Notification badge icon
- **bot-icon.png** - Shortcut icon for Bot feature
- **copilot-icon.png** - Shortcut icon for Copilot feature
- **companion-icon.png** - Shortcut icon for Companion feature

## Creating Your Icons

### Method 1: Online Tools (Easiest)

1. **PWA Builder Image Generator**
   - Visit: https://www.pwabuilder.com/imageGenerator
   - Upload a 512x512 source image
   - Download the generated icon pack
   - Copy icons to this folder

2. **RealFaviconGenerator**
   - Visit: https://realfavicongenerator.net/
   - Upload your source image
   - Download and extract icons
   - Copy PWA icons to this folder

3. **Favicon.io**
   - Visit: https://favicon.io/
   - Generate from text, image, or emoji
   - Download and use as base for resizing

### Method 2: Using Design Software

**Using Figma:**
```
1. Create a 512x512 artboard
2. Design your icon (graduation cap with "Sua Pa AI" branding)
3. Export at 1x, 1.5x, 2x, etc. for different sizes
4. Save as PNG with transparent background
```

**Using Adobe Illustrator/Photoshop:**
```
1. Create a 512x512 canvas
2. Design your icon
3. Use "Export for Screens" to generate multiple sizes
4. Choose PNG format with transparency
```

**Using GIMP (Free):**
```
1. Create a 512x512 image
2. Design your icon
3. For each size: Image → Scale Image
4. Export as PNG
```

### Method 3: Command Line (ImageMagick)

If you have ImageMagick installed:

```bash
# From a 512x512 source icon (icon-512x512.png)
convert icon-512x512.png -resize 72x72 icon-72x72.png
convert icon-512x512.png -resize 96x96 icon-96x96.png
convert icon-512x512.png -resize 128x128 icon-128x128.png
convert icon-512x512.png -resize 144x144 icon-144x144.png
convert icon-512x512.png -resize 152x152 icon-152x152.png
convert icon-512x512.png -resize 192x192 icon-192x192.png
convert icon-512x512.png -resize 384x384 icon-384x384.png
```

## Design Guidelines

### Icon Content
- **Simple & Recognizable**: Use the graduation cap logo
- **Brand Colors**: Use gradient from blue (#6366f1) to purple (#8b5cf6)
- **Readable**: Should be clear even at 72x72
- **No Text**: Avoid small text (except maybe "SP" or "Sua Pa")

### Technical Requirements
- **Format**: PNG with transparency
- **Color Space**: sRGB
- **Bit Depth**: 24-bit or 32-bit (with alpha)
- **Background**: Transparent or white
- **Safe Area**: Keep important elements in center 80%

### Maskable Icons
For icon-192x192.png and icon-512x512.png:
- These should work as "maskable" icons
- Ensure content fits within a safe zone
- Android will crop to various shapes (circle, squircle, etc.)
- Use at least 10% padding around edges

## Quick Start: Placeholder Icons

If you need to test immediately, you can create simple placeholder icons:

### Using HTML Canvas (Browser Console)
```javascript
// Run this in browser console to create basic icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(size => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Draw graduation cap icon (simplified)
    ctx.fillStyle = 'white';
    ctx.font = `${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎓', size / 2, size / 2);

    // Download
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icon-${size}x${size}.png`;
        a.click();
    });
});
```

## Recommended Design

For Sua Pa AI, we recommend:

```
┌─────────────────────────┐
│                         │
│      [Gradient BG]      │
│    Blue → Purple        │
│                         │
│         🎓             │
│     (Graduation Cap)    │
│                         │
│      Optional: SP       │
│                         │
└─────────────────────────┘
```

Or use the Font Awesome graduation cap icon on a gradient background.

## Validation

After creating your icons, validate them:

1. **Size Check**: Ensure each file is exactly the specified dimensions
2. **Format Check**: All should be PNG
3. **Quality Check**: No compression artifacts
4. **Transparency Check**: Background should be transparent or white
5. **Consistency Check**: All icons should look cohesive

## Testing Your Icons

1. Update `manifest.json` with correct icon paths
2. Deploy your PWA
3. Open in Chrome DevTools → Application → Manifest
4. Verify all icons load correctly
5. Test "Add to Home Screen" to see actual icon appearance

## Resources

- [PWA Icon Guidelines](https://web.dev/add-manifest/)
- [Material Design Icon Guidelines](https://material.io/design/iconography)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [Apple Touch Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)

---

**Note**: Until you add actual icons, the PWA will use default browser icons or may fail to install properly.
