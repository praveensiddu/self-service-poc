/**
 * UserProfileMenu Component
 *
 * Displays a user icon with a dropdown menu showing the logged-in user
 * and option to change user (in demo mode).
 *
 * Features:
 * - User icon button with accessible interactions
 * - Dropdown menu on click
 * - Auto-closes when clicking outside
 * - Shows current user name
 * - "Change User" option for demo mode
 */

function UserProfileMenu({
  currentUser,
  demoMode,
  onOpenChangeLoginUser,
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  /**
   * Toggle dropdown open/close state.
   */
  const toggleDropdown = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  /**
   * Close dropdown.
   */
  const closeDropdown = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Handle change user click.
   */
  const handleChangeUser = React.useCallback(() => {
    closeDropdown();
    if (onOpenChangeLoginUser) {
      onOpenChangeLoginUser();
    }
  }, [closeDropdown, onOpenChangeLoginUser]);

  /**
   * Close dropdown when clicking outside.
   */
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  /**
   * Close dropdown on Escape key.
   */
  React.useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeDropdown]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="userProfileMenu" ref={dropdownRef}>
      <button
        type="button"
        className="userProfileButton"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`User menu for ${currentUser}`}
        title={`Logged in as ${currentUser}`}
      >
        {/* User Icon SVG */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
          <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z" />
        </svg>
      </button>

      {isOpen && (
        <div className="userProfileDropdown" role="menu">
          <div className="userProfileDropdownHeader" role="menuitem">
            <div className="userProfileDropdownLabel">Logged in as</div>
            <div className="userProfileDropdownUsername">{currentUser}</div>
          </div>

          {demoMode && (
            <>
              <div className="userProfileDropdownDivider" />
              <button
                type="button"
                className="userProfileDropdownItem"
                onClick={handleChangeUser}
                role="menuitem"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                  <path fillRule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5z" />
                </svg>
                <span>Change User</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
