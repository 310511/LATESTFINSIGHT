import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import { cn } from "../../lib/utils";

export const DynamicNavigation = ({
  links = [],
  backgroundColor,
  textColor,
  highlightColor,
  glowIntensity = 5,
  className,
  showLabelsOnMobile = false,
  onLinkClick,
  activeLink,
  enableRipple = true,
  // New props for full navbar
  logo,
  logoText,
  logoSubtext,
  authButtons,
  onScrollChange,
  scrolled = false,
  mobileMenuItems,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef(null);
  const highlightRef = useRef(null);
  const location = useLocation();
  const [active, setActive] = useState(
    activeLink || (links && links.length > 0 ? links[0].id : null)
  );

  // Sync active state with current route
  useEffect(() => {
    if (activeLink) {
      setActive(activeLink);
    } else if (links && links.length > 0) {
      // Auto-detect active link from current pathname
      const currentPath = location.pathname;
      const matchingLink = links.find(link => {
        if (link.href === "/" || link.href === "") {
          return currentPath === "/" || currentPath === "";
        }
        return currentPath.startsWith(link.href);
      });
      if (matchingLink) {
        setActive(matchingLink.id);
      }
    }
  }, [location.pathname, activeLink, links]);

  // Directly define the default black and white theme styles
  const defaultThemeStyles = {
    bg: backgroundColor || "bg-white/80",
    border: "border border-[#E5E7EB]",
    text: textColor || "text-[#334155]",
    highlight: highlightColor || "bg-[#1E40AF]/10",
    glow: `shadow-[0_0_${glowIntensity}px_rgba(30,64,175,0.3)]`,
  };

  // Update highlight position based on active link
  const updateHighlightPosition = (id) => {
    if (!navRef.current || !highlightRef.current) return;

    const targetId = id || active;
    if (!targetId) return;

    const linkElement = navRef.current.querySelector(
      `#nav-item-${targetId}`
    );
    if (!linkElement) return;

    try {
      const { left, width } = linkElement.getBoundingClientRect();
      const navRect = navRef.current.getBoundingClientRect();

      highlightRef.current.style.transform = `translateX(${
        left - navRect.left
      }px)`;
      highlightRef.current.style.width = `${width}px`;
    } catch (error) {
      console.warn('Error updating highlight position:', error);
    }
  };

  // Create ripple effect
  const createRipple = (event) => {
    if (!enableRipple) return;

    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${
      event.clientX - button.getBoundingClientRect().left - diameter / 2
    }px`;
    circle.style.top = `${
      event.clientY - button.getBoundingClientRect().top - diameter / 2
    }px`;
    circle.classList.add(
      "absolute",
      "bg-white",
      "rounded-full",
      "pointer-events-none",
      "opacity-30",
      "animate-ripple"
    );

    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  };

  // Handle link click
  const handleLinkClick = (id, event) => {
    if (enableRipple) {
      createRipple(event);
    }
    setActive(id);
    if (onLinkClick) {
      onLinkClick(id);
    }
  };

  // Handle link hover
  const handleLinkHover = (id) => {
    if (!navRef.current || !highlightRef.current || !id) return;
    try {
      updateHighlightPosition(id);
    } catch (error) {
      console.warn('Error updating highlight on hover:', error);
    }
  };

  // Set initial highlight position and update on window resize
  useEffect(() => {
    if (!active || !links || links.length === 0) return;

    // Use setTimeout to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        updateHighlightPosition();
      } catch (error) {
        console.warn('Error updating highlight on mount:', error);
      }
    }, 100);

    const handleResize = () => {
      try {
        updateHighlightPosition();
      } catch (error) {
        console.warn('Error updating highlight on resize:', error);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [active]);

  // Update when active link changes externally
  useEffect(() => {
    if (activeLink && activeLink !== active) {
      setActive(activeLink);
    }
  }, [activeLink]);

  // Don't render if no links
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <header 
      className={cn(
        `sticky top-0 z-50 transition-all duration-500 ease-in-out`,
        scrolled 
          ? "bg-white/95 backdrop-blur-xl shadow-lg shadow-gray-900/10 border-b border-[#E5E7EB]/80" 
          : "bg-white/90 backdrop-blur-lg shadow-md shadow-gray-900/5 border-b border-[#E5E7EB]/50"
      )}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-20 lg:min-h-24 py-3 lg:py-4">
          {/* Logo (left) */}
          {logo && (
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-3 lg:gap-4 group">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-[#1E40AF]/20 via-[#8B5CF6]/20 to-[#22D3EE]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  <div className="relative p-2 rounded-xl bg-white border border-[#E5E7EB] group-hover:border-[#1E40AF]/30 transition-all duration-300 group-hover:scale-105">
                    <img
                      src={logo}
                      alt="Logo"
                      width={44}
                      height={44}
                      className="block transition-transform duration-300"
                    />
                  </div>
                </div>
                {(logoText || logoSubtext) && (
                  <div className="flex flex-col">
                    {logoText && (
                      <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-[#1E40AF] to-[#8B5CF6] bg-clip-text text-transparent leading-tight">
                        {logoText}
                      </span>
                    )}
                    {logoSubtext && (
                      <span className="text-[10px] text-[#64748B] font-medium -mt-0.5 hidden lg:block">
                        {logoSubtext}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </div>
          )}

          {/* Navigation Links - Center */}
          <div className="hidden lg:flex items-center justify-center flex-1">
            <nav
              ref={navRef}
              className={cn(
                `relative rounded-full backdrop-blur-md border 
                shadow-lg transition-all duration-300`,
                defaultThemeStyles.bg,
                defaultThemeStyles.border,
                defaultThemeStyles.glow,
                className
              )}
              style={{
                backgroundColor: backgroundColor,
                color: textColor,
              }}
            >
              {/* Background highlight */}
              <div
                ref={highlightRef}
                className={cn(
                  `absolute top-0 left-0 h-full rounded-full transition-all 
                  duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-0`,
                  defaultThemeStyles.highlight
                )}
                style={{
                  backgroundColor: highlightColor,
                }}
              ></div>

              <ul className="flex justify-between items-center gap-4 py-2 relative z-10">
                {links.map((link) => (
                  <li
                    key={link.id}
                    className="flex-1 rounded-full mx-1 lg:mx-2 px-4"
                    id={`nav-item-${link.id}`}
                  >
                    <Link
                      to={link.href}
                      className={cn(
                        `flex gap-1 items-center justify-center h-8 md:h-8 text-xs md:text-sm 
                        rounded-full font-medium transition-all duration-300 hover:scale-105 
                        relative overflow-hidden`,
                        defaultThemeStyles.text,
                        active === link.id && "font-semibold"
                      )}
                      onClick={(e) => {
                        handleLinkClick(link.id, e);
                      }}
                      onMouseEnter={() => handleLinkHover(link.id)}
                    >
                      {link.icon && (
                        <span className="text-current text-xs">
                          {link.icon}
                        </span>
                      )}
                      <span
                        className={cn(showLabelsOnMobile ? "flex" : "hidden sm:flex")}
                      >
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Auth Buttons (right) */}
          {authButtons && (
            <div className="hidden lg:flex items-center gap-4 ml-6">
              {authButtons}
            </div>
          )}

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-4">
            {authButtons}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2.5 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/50 transition-all duration-200"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <FiX className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <FiMenu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuItems && (
        <div 
          className={`${isMobileMenuOpen ? "block" : "hidden"} lg:hidden border-t border-[#E5E7EB] bg-[rgba(255,255,255,0.95)] backdrop-blur-xl shadow-lg`}
        >
          <div className="px-4 pt-2 pb-6 space-y-1">
            {React.Children.map(mobileMenuItems, (child) => {
              if (React.isValidElement(child)) {
                // Skip Fragments as they don't accept props other than key and children
                const isFragment = child.type === React.Fragment || 
                                   (typeof child.type === 'symbol' && child.type.toString() === 'Symbol(react.fragment)');
                
                if (isFragment) {
                  // If it's a Fragment, map its children instead
                  return React.Children.map(child.props.children, (fragmentChild) => {
                    if (React.isValidElement(fragmentChild)) {
                      return React.cloneElement(fragmentChild, {
                        onClick: (e) => {
                          setIsMobileMenuOpen(false);
                          if (fragmentChild.props.onClick) {
                            fragmentChild.props.onClick(e);
                          }
                        }
                      });
                    }
                    return fragmentChild;
                  });
                }
                // For non-Fragment elements, clone with onClick
                return React.cloneElement(child, {
                  onClick: (e) => {
                    setIsMobileMenuOpen(false);
                    if (child.props.onClick) {
                      child.props.onClick(e);
                    }
                  }
                });
              }
              return child;
            })}
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        .animate-ripple {
          animation: ripple 0.6s linear;
        }
`,
        }}
      />
    </header>
  );
};

export default DynamicNavigation;
