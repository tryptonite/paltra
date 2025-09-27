# Public Assets

This folder contains static assets that are served directly by Vite.

## Folder Structure

- `images/` - General images, photos, graphics
- `logos/` - Company logos, brand assets
- `icons/` - Icon files, favicons, app icons

## Usage

### In React Components
```tsx
// Import images
import logo from '/logos/paltralogotp.png'
import heroImage from '/images/hero-bg.jpg'

// Use in JSX
<img src={logo} alt="Paltra Logo" />
<img src={heroImage} alt="Hero Background" />
```

### In CSS
```css
.hero-section {
  background-image: url('/images/hero-bg.jpg');
}

.logo {
  background-image: url('/logos/paltralogotp.png');
}
```

### Direct URL Access
Files in this folder are accessible directly via URL:
- `http://localhost:3000/logos/paltra-logo.png`
- `http://localhost:3000/images/hero-bg.jpg`

## File Naming Conventions

- Use kebab-case for file names: `paltra-logo.png`
- Use descriptive names: `hero-background.jpg` instead of `img1.jpg`
- Include size in filename if multiple versions: `logo-32x32.png`, `logo-64x64.png`

## Supported Formats

- **Images**: PNG, JPG, JPEG, GIF, SVG, WebP
- **Icons**: ICO, PNG, SVG
- **Other**: PDF, TXT, JSON (for data files)

## Optimization Tips

- Use WebP format for better compression
- Optimize images before adding them
- Consider using different sizes for responsive images
- SVG is preferred for logos and simple graphics
