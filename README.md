# Stockroom — Inventory

A small, beginner-friendly inventory tracker that runs in your web browser. It needs no installation, account, or server.

## Try it

1. Open the project on GitHub: https://github.com/gamer007-Nan/inventory-system
2. Click `index.html` in the file list.
3. Click the pencil (Edit this file) only if you want to change the code; to use the app online, follow the GitHub Pages steps below.

### Publish it free with GitHub Pages

1. On the repository page, click **Settings**.
2. In the left menu, under **Code and automation**, choose **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder, then click **Save**.
5. Wait a minute or two. The Pages screen will show the link to your app.

When you open that link, add products and use **Adjust** to record stock coming in or going out. **Edit** changes product details; **Delete** removes a product. Products at or below their low-stock alert quantity are marked as low stock. Recent changes appear under **Recent activity**.

## Important beginner note

This first version saves its data only in the browser storage on the device where you use it. It is a good demo or personal tracker, but it does not sync between people or devices and has no online backup. Clearing browser data may erase the inventory. Don't use it as the only copy of important business records.

## Features

- Add, edit, search, and delete products
- Track quantities and optional SKUs
- Record stock increases and decreases, with a history of recent changes
- Set per-product low-stock alert levels
- Summary of products, total units, and low-stock items
- Mobile-friendly layout and browser-local saving

## Files

- `index.html` — page structure and dialogs
- `styles.css` — visual styling and mobile layout
- `app.js` — inventory behavior and browser storage
