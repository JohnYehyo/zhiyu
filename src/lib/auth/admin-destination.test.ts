import { expect,it } from "vitest";
import { adminDestination, adminLoginUrl } from "./admin-destination";
it("keeps album, article and quick-compose destinations without accepting external URLs",()=>{
 for(const destination of ["/admin","/admin/album","/admin/posts/new","/admin/posts/8611d30d-543d-463c-99ef-06f4c54c7c5b"]){
  expect(adminDestination(destination)).toBe(destination);
  expect(adminLoginUrl(destination)).toBe(destination==="/admin"?"/admin/login":`/admin/login?next=${encodeURIComponent(destination)}`);
 }
 for(const unsafe of [undefined,"https://evil.test","//evil.test","/admin/../other","/admin\\evil","/admin/posts/new?next=//evil","/api/admin/media","/admin/password",["/admin/album","/admin"]])expect(adminDestination(unsafe)).toBe("/admin");
});
