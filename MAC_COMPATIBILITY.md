# Mac Compatibility Changes

This document describes the changes made to make the FinSight project compatible with macOS.

## Changes Made

### 1. Cross-Platform Executable Detection (`backend/app.py`)
- Added OS detection using `platform.system()`
- Removed hardcoded `.exe` extensions - now uses `EXE_EXT` variable that's empty on Mac/Linux
- Updated Poppler executable checks to work on both Windows and Mac

### 2. Mac Setup Script (`backend/setup_python.sh`)
- Created a bash script equivalent to `setup_python.bat` for Mac/Linux users
- Handles virtual environment creation and dependency installation
- Provides Mac-specific installation instructions

### 3. Updated Test Scripts
- **`backend/test_poppler.py`**: Now detects OS and uses correct executable names
- **`backend/test_tesseract.py`**: Enhanced to auto-detect Tesseract in PATH and provide Mac-specific help

### 4. Mac Installation Guide (`backend/INSTALL_MAC.md`)
- Comprehensive guide for installing dependencies on macOS
- Instructions for both Apple Silicon and Intel Macs
- Troubleshooting section for common Mac issues

### 5. Updated Documentation
- `backend/README_PYTHON.md`: Added Mac-specific instructions
- All references to Windows-only paths updated to be cross-platform

## Quick Start on Mac

1. **Install dependencies:**
   ```bash
   brew install tesseract poppler
   ```

2. **Set up Python environment:**
   ```bash
   cd backend
   ./setup_python.sh
   ```

3. **Create `.env` file:**
   ```env
   OPENAI_API_KEY=your_key_here
   # If not in PATH (usually not needed if installed via Homebrew):
   # TESSERACT_CMD=/opt/homebrew/bin/tesseract
   # POPPLER_PATH=/opt/homebrew
   ```

4. **Test installation:**
   ```bash
   source venv/bin/activate
   python test_tesseract.py
   python test_poppler.py
   ```

5. **Run the server:**
   ```bash
   python run.py
   ```

## Key Differences from Windows

1. **No `.exe` extensions**: Mac executables don't have file extensions
2. **Path separators**: Mac uses forward slashes `/` (though Python handles both)
3. **Virtual environment activation**: Use `source venv/bin/activate` instead of `venv\Scripts\activate.bat`
4. **Package manager**: Use Homebrew instead of downloading installers
5. **Installation paths**: 
   - Apple Silicon: `/opt/homebrew`
   - Intel: `/usr/local`

## Testing

The code now automatically detects the operating system and uses the appropriate:
- Executable names (with or without `.exe`)
- Path handling
- Error messages

All functionality should work identically on both Windows and Mac.


# Updated: Thu Dec 25 17:21:01 IST 2025
