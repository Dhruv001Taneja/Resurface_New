"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { fetchVaultApi, toggleVaultApi } from "../utils/api";

export default function VaultPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [vaultItems, setVaultItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState(null);

    // Load Vault items from backend
    useEffect(() => {
        const loadVaultItems = async () => {
            if (!isAuthenticated) return;

            try {
                setLoading(true);
                setError("");

                const response = await fetchVaultApi();

                if (response?.data && Array.isArray(response.data)) {
                    setVaultItems(response.data);
                } else {
                    setVaultItems([]);
                }
            } catch (err) {
                console.error("Error loading Vault:", err);
                setError(err.message || "Failed to load Vault");
            } finally {
                setLoading(false);
            }
        };

        loadVaultItems();
    }, [isAuthenticated]);

    // Remove screenshot from Vault
    const handleRemoveFromVault = async (id) => {
        const confirmed = window.confirm(
            "Remove this screenshot from Vault? It will return to your normal Screenshots."
        );

        if (!confirmed) return;

        try {
            setRemovingId(id);

            await toggleVaultApi(id);

            setVaultItems((prev) =>
                prev.filter((item) => getItemId(item) !== id)
            );
        } catch (err) {
            console.error("Error removing Vault item:", err);
            alert(err.message || "Failed to remove item from Vault");
        } finally {
            setRemovingId(null);
        }
    };

    // Get MongoDB ID
    const getItemId = (item) => {
        return item?._id || item?.id;
    };

    // Get title from screenshot
    const getTitle = (item) => {
        return (
            item?.aiAnalysis?.title ||
            item?.title ||
            item?.originalName ||
            "Protected Screenshot"
        );
    };

    // Get category
    const getCategory = (item) => {
        return (
            item?.aiAnalysis?.category ||
            item?.category ||
            "Other"
        );
    };

    // Get tags
    const getTags = (item) => {
        if (Array.isArray(item?.aiAnalysis?.tags)) {
            return item.aiAnalysis.tags;
        }

        if (Array.isArray(item?.tags)) {
            return item.tags;
        }

        return [];
    };

    // Get image
    const getImageUrl = (item) => {
        return (
            item?.thumbnailUrl ||
            item?.storage?.thumbnailUrl ||
            item?.imageUrl ||
            item?.storage?.imageUrl ||
            ""
        );
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return "Recently";

        try {
            return new Date(date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            return "Recently";
        }
    };

    // Filter Vault items
    const filteredItems = vaultItems.filter((item) => {
        const title = getTitle(item);
        const category = getCategory(item);
        const tags = getTags(item).join(" ");

        const searchableText =
            `${title} ${category} ${tags} ${item?.originalName || ""}`.toLowerCase();

        return searchableText.includes(searchQuery.toLowerCase());
    });

    // Category counts
    const passwordCount = vaultItems.filter((item) => {
        const text = `${getTitle(item)} ${getCategory(item)} ${getTags(item).join(
            " "
        )}`.toLowerCase();

        return (
            text.includes("password") ||
            text.includes("credential") ||
            text.includes("login")
        );
    }).length;

    const cardCount = vaultItems.filter((item) => {
        const text = `${getTitle(item)} ${getCategory(item)} ${getTags(item).join(
            " "
        )}`.toLowerCase();

        return (
            text.includes("card") ||
            text.includes("debit") ||
            text.includes("credit")
        );
    }).length;

    const bankCount = vaultItems.filter((item) => {
        const text = `${getTitle(item)} ${getCategory(item)} ${getTags(item).join(
            " "
        )}`.toLowerCase();

        return (
            text.includes("bank") ||
            text.includes("account") ||
            text.includes("upi")
        );
    }).length;

    const documentCount = vaultItems.filter((item) => {
        const text = `${getTitle(item)} ${getCategory(item)} ${getTags(item).join(
            " "
        )}`.toLowerCase();

        return (
            text.includes("document") ||
            text.includes("pan") ||
            text.includes("aadhaar") ||
            text.includes("passport") ||
            text.includes("id")
        );
    }).length;

    // Authentication loading
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-500">Loading Vault...</div>
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-5xl mb-4">🔒</div>

                    <h2 className="text-xl font-bold text-gray-900">
                        Authentication Required
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Please log in to access your Vault.
                    </p>

                    <button
                        onClick={() => router.push("/login")}
                        className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-xl"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* HEADER */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="p-2 rounded-lg hover:bg-gray-100 transition"
                    >
                        ←
                    </button>

                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold">
                            🔒 Vault
                        </h1>

                        <p className="text-xs sm:text-sm text-gray-500">
                            Your private information
                        </p>
                    </div>
                </div>

                <div className="text-sm text-gray-600 hidden sm:block">
                    {user?.email}
                </div>
            </header>

            {/* MAIN */}
            <main className="max-w-7xl mx-auto p-4 sm:p-8">
                {/* INTRO */}
                <section className="mb-8">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Your Secure Vault 🔐
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Sensitive screenshots detected from your existing uploads are
                        stored here securely.
                    </p>
                </section>

                {/* SEARCH */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-3 text-gray-400">
                            🔍
                        </span>

                        <input
                            type="text"
                            placeholder="Search your vault..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* CATEGORY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                    <CategoryCard
                        icon="🔑"
                        title="Passwords"
                        count={`${passwordCount} items`}
                    />

                    <CategoryCard
                        icon="💳"
                        title="Cards"
                        count={`${cardCount} items`}
                    />

                    <CategoryCard
                        icon="🏦"
                        title="Bank Accounts"
                        count={`${bankCount} items`}
                    />

                    <CategoryCard
                        icon="📄"
                        title="Documents"
                        count={`${documentCount} items`}
                    />
                </div>

                {/* SECURITY NOTICE */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-8">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🛡️</span>

                        <div>
                            <h3 className="font-bold text-indigo-900">
                                Your information is protected
                            </h3>

                            <p className="text-sm text-indigo-700 mt-1">
                                Sensitive information is hidden by default. Only screenshots
                                already uploaded to RESecure can appear here. No second upload
                                is required.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⚠️</span>

                            <div>
                                <h3 className="font-bold text-red-900">
                                    Failed to load Vault
                                </h3>

                                <p className="text-sm text-red-700 mt-1">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* RECENT ITEMS */}
                <section>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-xl font-extrabold">
                                Recent Items
                            </h2>

                            <p className="text-sm text-gray-500 mt-1">
                                Your recently protected screenshots
                            </p>
                        </div>

                        <span className="text-sm text-gray-500">
                            {filteredItems.length} items
                        </span>
                    </div>

                    {/* LOADING */}
                    {loading ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
                            <div className="text-3xl mb-3">🔄</div>

                            <h3 className="font-bold text-lg">
                                Loading Vault...
                            </h3>

                            <p className="text-sm text-gray-500 mt-1">
                                Fetching your protected screenshots.
                            </p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        /* EMPTY STATE */
                        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
                            <div className="text-5xl mb-4">🔐</div>

                            <h3 className="font-bold text-lg">
                                {searchQuery
                                    ? "No matching items found"
                                    : "Your Vault is empty"}
                            </h3>

                            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                                {searchQuery
                                    ? "Try a different search."
                                    : "When a screenshot contains sensitive information, it can be moved into your Vault without uploading the image again."}
                            </p>

                            {!searchQuery && (
                                <button
                                    onClick={() => router.push("/screenshots")}
                                    className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-xl transition"
                                >
                                    View Screenshots
                                </button>
                            )}
                        </div>
                    ) : (
                        /* ITEMS */
                        <div className="space-y-4">
                            {filteredItems.map((item) => (
                                <VaultItem
                                    key={getItemId(item)}
                                    item={item}
                                    title={getTitle(item)}
                                    category={getCategory(item)}
                                    tags={getTags(item)}
                                    imageUrl={getImageUrl(item)}
                                    updated={formatDate(item.updatedAt || item.createdAt)}
                                    removing={removingId === getItemId(item)}
                                    onRemove={() =>
                                        handleRemoveFromVault(getItemId(item))
                                    }
                                    onOpen={() => {
                                        const id = getItemId(item);

                                        if (id) {
                                            router.push(`/screenshots?id=${id}`);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

/* =========================================================
   CATEGORY CARD
========================================================= */

function CategoryCard({ icon, title, count }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition">
            <div className="flex items-center justify-between">
                <div className="text-3xl">
                    {icon}
                </div>

                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {count}
                </span>
            </div>

            <h3 className="font-bold text-lg mt-4">
                {title}
            </h3>

            <p className="text-sm text-gray-500 mt-1">
                Securely stored
            </p>
        </div>
    );
}

/* =========================================================
   VAULT ITEM
========================================================= */

function VaultItem({
    item,
    title,
    category,
    tags,
    imageUrl,
    updated,
    removing,
    onRemove,
    onOpen,
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                {/* LEFT */}
                <div className="flex items-center gap-4 min-w-0">
                    {/* IMAGE */}
                    <div className="h-16 w-16 rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center shrink-0">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="Protected screenshot"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-2xl">🔒</span>
                        )}
                    </div>

                    {/* DETAILS */}
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                            {title}
                        </h3>

                        <p className="text-sm text-gray-500">
                            {category}
                        </p>

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {tags.slice(0, 3).map((tag, index) => (
                                    <span
                                        key={`${tag}-${index}`}
                                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT */}
                <div className="flex flex-col sm:items-end gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">
                            🔒 Protected
                        </span>

                        <span className="text-xs text-gray-400">
                            {updated}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onOpen}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            View
                        </button>

                        <button
                            onClick={onRemove}
                            disabled={removing}
                            className="px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                        >
                            {removing ? "Removing..." : "Remove"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}