/**
 * Host half of dock — currently an empty shell.
 *
 * The base owns the *window* (client layout shell + registry service); all
 * feature domains (fs / git / terminal / ...) live in feature plugins with
 * their own host routes. Layout persistence happens on the client
 * (localStorage), so the host half has no routes yet.
 */
export declare const name = "dock-base";
/** No host-side services required yet. */
export declare function apply(): void;
