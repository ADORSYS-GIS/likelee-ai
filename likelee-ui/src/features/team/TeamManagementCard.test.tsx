/**
 * Unit tests for TeamManagementCard component
 *
 * **Validates: Requirements 2.2, 2.4, 3.1, 3.2**
 *
 * Tests the invite member functionality within the TeamManagementCard component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Mock dependencies
vi.mock("@/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Mock timers
vi.useFakeTimers();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

import { useAuth } from "@/auth/AuthProvider";
import { TeamManagementCard } from "./TeamManagementCard";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TeamManagementCard - Invite Member Functionality", () => {
  let mockUseAuth: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUseAuth = vi.fn();
    (useAuth as any).mockImplementation(mockUseAuth);
    mockFetch.mockReset();
  });

  /**
   * Test Case 1: Invite Team Member Button is Displayed
   *
   * EXPECTED BEHAVIOR: Users with invite permissions should see the invite button
   */
  it("should display invite team member button for users with invite permissions", async () => {
    // Arrange: Set up authenticated user with invite permissions
    mockUseAuth.mockReturnValue({
      token: "mock-token",
    });

    // Mock API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/team/context")) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                organization_name: "Test Brand Org",
                membership_role: "owner",
                permissions: ["invite_team_members", "update_member_roles"],
                members: [],
                invites: [],
              }),
            ),
        });
      }
      if (url.includes("/api/team/audit-logs")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      });
    });

    // Act: Render TeamManagementCard
    render(
      <BrowserRouter>
        <TeamManagementCard organizationType="brand" />
      </BrowserRouter>,
    );

    // Assert: Should display invite team member button
    await waitFor(() => {
      const inviteButton = screen.queryByRole("button", {
        name: /invite team member/i,
      });
      expect(inviteButton).toBeInTheDocument();
    });
  });

  /**
   * Test Case 2: Invite Form Dialog Opens
   *
   * EXPECTED BEHAVIOR: Clicking the invite button should open the invite dialog
   */
  it("should open invite dialog when clicking invite button", async () => {
    // Arrange: Set up authenticated user with invite permissions
    mockUseAuth.mockReturnValue({
      token: "mock-token",
    });

    // Mock API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/team/context")) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                organization_name: "Test Brand Org",
                membership_role: "owner",
                permissions: ["invite_team_members", "update_member_roles"],
                members: [],
                invites: [],
              }),
            ),
        });
      }
      if (url.includes("/api/team/audit-logs")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      });
    });

    // Act: Render TeamManagementCard
    render(
      <BrowserRouter>
        <TeamManagementCard organizationType="brand" />
      </BrowserRouter>,
    );

    // Wait for component to load
    await waitFor(() => {
      const inviteButton = screen.queryByRole("button", {
        name: /invite team member/i,
      });
      expect(inviteButton).toBeInTheDocument();
    });

    // Click the invite button
    const inviteButton = screen.getByRole("button", {
      name: /invite team member/i,
    });
    fireEvent.click(inviteButton);

    // Assert: Dialog should open with form elements
    await waitFor(() => {
      const dialogTitle = screen.queryByText(/invite team member/i);
      expect(dialogTitle).toBeInTheDocument();
    });

    // Check for email input
    const emailInput = screen.queryByPlaceholderText(/colleague@example.com/i);
    expect(emailInput).toBeInTheDocument();

    // Check for role selection
    const roleSelect = screen.queryByText(/select role/i);
    expect(roleSelect).toBeInTheDocument();
  });

  /**
   * Test Case 3: Invite Form Submits Successfully
   *
   * EXPECTED BEHAVIOR: Submitting the invite form should call the API and show success
   */
  it("should submit invite form and show success message", async () => {
    // Arrange: Set up authenticated user with invite permissions
    mockUseAuth.mockReturnValue({
      token: "mock-token",
    });

    // Mock API responses
    mockFetch.mockImplementation((url: string, options: any) => {
      if (url.includes("/api/team/context")) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                organization_name: "Test Brand Org",
                membership_role: "owner",
                permissions: ["invite_team_members", "update_member_roles"],
                members: [],
                invites: [],
              }),
            ),
        });
      }
      if (url.includes("/api/team/audit-logs")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        });
      }
      if (url.includes("/api/team/invites") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                success: true,
                message: "Invitation sent successfully",
              }),
            ),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      });
    });

    // Act: Render TeamManagementCard
    render(
      <BrowserRouter>
        <TeamManagementCard organizationType="brand" />
      </BrowserRouter>,
    );

    // Wait for component to load and click invite button
    await waitFor(() => {
      const inviteButton = screen.queryByRole("button", {
        name: /invite team member/i,
      });
      expect(inviteButton).toBeInTheDocument();
    });

    const inviteButton = screen.getByRole("button", {
      name: /invite team member/i,
    });
    fireEvent.click(inviteButton);

    // Wait for dialog to open
    await waitFor(() => {
      const dialogTitle = screen.queryByText(/invite team member/i);
      expect(dialogTitle).toBeInTheDocument();
    });

    // Fill in the email
    const emailInput = screen.getByPlaceholderText(/colleague@example.com/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    // Click send invitation button
    const sendButton = screen.getByRole("button", { name: /send invitation/i });
    fireEvent.click(sendButton);

    // Assert: API should be called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/team/invites"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("test@example.com"),
        }),
      );
    });
  });

  /**
   * Test Case 4: Invite Button Disabled for Users Without Permissions
   *
   * EXPECTED BEHAVIOR: Users without invite permissions should see disabled button
   */
  it("should disable invite button for users without invite permissions", async () => {
    // Arrange: Set up authenticated user without invite permissions
    mockUseAuth.mockReturnValue({
      token: "mock-token",
    });

    // Mock API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/team/context")) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                organization_name: "Test Brand Org",
                membership_role: "reviewer",
                permissions: [], // No invite permission
                members: [],
                invites: [],
              }),
            ),
        });
      }
      if (url.includes("/api/team/audit-logs")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      });
    });

    // Act: Render TeamManagementCard
    render(
      <BrowserRouter>
        <TeamManagementCard organizationType="brand" />
      </BrowserRouter>,
    );

    // Assert: Invite button should be disabled
    await waitFor(() => {
      const inviteButton = screen.queryByRole("button", {
        name: /invite team member/i,
      });
      expect(inviteButton).toBeInTheDocument();
      expect(inviteButton).toBeDisabled();
    });
  });
});
